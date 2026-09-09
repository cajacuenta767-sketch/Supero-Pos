import { create } from 'zustand';
import { readPersisted, writePersisted } from './persist';

/**
 * Tickets emitidos, únicos para toda la terminal.
 *
 * Antes el historial de Informes era una lista inventada dentro de la propia
 * vista: se cobraba en el punto de venta y el ticket no aparecía nunca en
 * Informes, mientras la pantalla mostraba tres ventas de agosto que jamás
 * ocurrieron. Anular una de esas ventas ficticias tampoco devolvía nada al
 * inventario, porque sus SKU (`SKU-1001`) no existen en el catálogo.
 *
 * Ahora el cobro escribe aquí y el historial lee de aquí: vender, consultar y
 * anular son tres vistas del mismo hecho.
 */

const STORAGE_KEY = 'tickets';

/** Cuántos tickets se conservan en la terminal. El resto vive en el servidor. */
const TICKET_LIMIT = 400;

export type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'MIXED';

/** Una forma de pago concreta dentro de un ticket. */
export interface PaymentLine {
  method: 'CASH' | 'CARD' | 'QR';
  amount_received: number;
  change_given: number;
}

export interface SoldItem {
  /** Identificador del producto en el catálogo: es lo que permite devolverlo. */
  id: number;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  serials?: string[];
  unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
}

export interface SaleTicket {
  /** Número correlativo visible, p. ej. `TK-10024`. */
  id: string;
  /** ISO 8601. La presentación la decide quien lo muestra, no el dato. */
  at: string;
  cashier_name: string;
  customer_name?: string;
  /** Sucursal donde se emitió. Sin esto no se puede consolidar ni comparar. */
  branch_id?: string;
  branch_name?: string;
  payment_method: PaymentMethod;
  /** Desglose por forma de pago. En un ticket mixto es lo único que permite
   *  saber cuánto entró en la gaveta y cuánto por pasarela. */
  payments: PaymentLine[];
  total: number;
  cash_given: number;
  change: number;
  status: 'COMPLETED' | 'CANCELLED';
  items: SoldItem[];
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
}

/* Semilla mínima para que el historial no abra vacío en una terminal nueva.
   A diferencia de la anterior, apunta a productos que existen de verdad en el
   catálogo, de modo que anularla devuelve mercancía real. */
const SEED: SaleTicket[] = [
  {
    id: 'TK-10024',
    at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    cashier_name: 'Juan Pérez',
    branch_id: 'branch-1',
    branch_name: 'Sucursal Central - Av. Principal #123',
    payment_method: 'CASH',
    payments: [{ method: 'CASH', amount_received: 100.0, change_given: 26.0 }],
    total: 74.0,
    cash_given: 100.0,
    change: 26.0,
    status: 'COMPLETED',
    items: [
      {
        id: 107,
        sku: 'BEB-COL-007',
        name: 'Coca Cola 2 Litros Retornable',
        quantity: 2,
        unit_price: 12.0,
        subtotal: 24.0,
        unit_type: 'UNIT',
      },
      {
        id: 106,
        sku: 'AB-LAC-006',
        name: 'Leche Entera 1 Litro (Caja)',
        quantity: 4,
        unit_price: 8.5,
        subtotal: 34.0,
        unit_type: 'UNIT',
      },
      {
        id: 103,
        sku: 'ELE-AUD-003',
        name: 'Audífonos Bluetooth Wireless Pro',
        quantity: 1,
        unit_price: 35.0,
        subtotal: 35.0,
        unit_type: 'UNIT',
      },
    ],
  },
  {
    id: 'TK-10023',
    at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
    cashier_name: 'María Gómez',
    branch_id: 'branch-2',
    branch_name: 'Sucursal Norte - Mall Plaza Local 45',
    payment_method: 'QR',
    payments: [{ method: 'QR', amount_received: 144.9, change_given: 0 }],
    total: 144.9,
    cash_given: 144.9,
    change: 0,
    status: 'COMPLETED',
    items: [
      {
        id: 102,
        sku: 'AB-QSO-002',
        name: 'Queso Criollo San Javier (kg)',
        quantity: 3.22,
        unit_price: 45.0,
        subtotal: 144.9,
        unit_type: 'FRACTION',
      },
    ],
  },
];

interface SalesState {
  tickets: SaleTicket[];
  /** Registra un ticket cobrado. Devuelve el ticket tal como quedó guardado. */
  recordSale: (ticket: Omit<SaleTicket, 'status'>) => SaleTicket;
  /** Marca un ticket como anulado. Devolver el stock es cosa de quien anula. */
  voidTicket: (id: string, reason: string, by: string) => SaleTicket | null;
  /** Vuelve a leer lo guardado: otra ventana de la misma caja pudo cobrar. */
  hydrate: () => void;
  /**
   * Efectivo que entró en la gaveta desde un instante dado.
   *
   * Se sumaba de la cola de sincronización, que se vacía al sincronizar: en
   * cuanto las ventas subían al servidor, el esperado del arqueo caía y el
   * cierre acusaba al cajero de un faltante que era la recaudación entera.
   * Los tickets no se vacían, y un ticket anulado deja de contar porque su
   * dinero volvió al cliente.
   */
  cashSince: (sinceIso: string) => number;
  ticketById: (id: string) => SaleTicket | undefined;
}

const persist = (tickets: SaleTicket[]) => {
  writePersisted(STORAGE_KEY, tickets);
  return tickets;
};

export const useSalesStore = create<SalesState>((set, get) => ({
  tickets: readPersisted<SaleTicket[]>(STORAGE_KEY) ?? SEED,

  recordSale: (ticket) => {
    const created: SaleTicket = { ...ticket, status: 'COMPLETED' };
    set((state) => ({ tickets: persist([created, ...state.tickets].slice(0, TICKET_LIMIT)) }));
    return created;
  },

  voidTicket: (id, reason, by) => {
    const target = get().tickets.find((t) => t.id === id);
    /* Anular dos veces devolvería la mercancía dos veces. */
    if (!target || target.status === 'CANCELLED') return null;

    const voided: SaleTicket = {
      ...target,
      status: 'CANCELLED',
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      cancelled_by: by,
    };
    set((state) => ({ tickets: persist(state.tickets.map((t) => (t.id === id ? voided : t))) }));
    return voided;
  },

  hydrate: () => {
    const stored = readPersisted<SaleTicket[]>(STORAGE_KEY);
    if (stored) set({ tickets: stored });
  },

  cashSince: (sinceIso) =>
    get()
      .tickets.filter((t) => t.status === 'COMPLETED' && t.at >= sinceIso)
      .reduce(
        (total, t) =>
          total +
          t.payments
            .filter((pay) => pay.method === 'CASH')
            .reduce((sum, pay) => sum + pay.amount_received - pay.change_given, 0),
        0,
      ),

  ticketById: (id) => get().tickets.find((t) => t.id === id),
}));

import { create } from 'zustand';
import { readPersisted, writePersisted } from './persist';
import { localId } from '../utils/ids';
import type { Customer as PosCustomer } from './usePosStore';

/**
 * Clientes, únicos para toda la terminal.
 *
 * Existían dos listas sin relación: la de Contactos y otra escrita dentro del
 * selector de cliente del punto de venta. El mismo cliente —«Comercial Bolivia
 * S.R.L.»— figuraba en las dos con NIT distinto (1029384029 frente a
 * 1029384756), otro límite de crédito y otra deuda. Dar de alta un cliente en
 * Contactos no permitía venderle, y a los del punto de venta no se les podía
 * consultar el saldo.
 */

const STORAGE_KEY = 'clientes';

/** Grupo comercial. Decide la regla de precio y el descuento. */
export type CustomerGroup = 'GENERAL' | 'MINORISTA' | 'MAYORISTA' | 'CORPORATIVO' | 'VIP';

export const GROUP_LABEL: Record<CustomerGroup, string> = {
  GENERAL: 'General',
  MINORISTA: 'Minorista',
  MAYORISTA: 'Mayorista',
  CORPORATIVO: 'Corporativo',
  VIP: 'Frecuente VIP',
};

/** Descuento del grupo, en porcentaje. */
export const GROUP_DISCOUNT: Record<CustomerGroup, number> = {
  GENERAL: 0,
  MINORISTA: 0,
  MAYORISTA: 0,
  CORPORATIVO: 3,
  VIP: 5,
};

export const GROUP_PRICE_RULE: Record<CustomerGroup, 'RETAIL' | 'WHOLESALE' | 'DISCOUNT_FIXED'> = {
  GENERAL: 'RETAIL',
  MINORISTA: 'RETAIL',
  MAYORISTA: 'WHOLESALE',
  CORPORATIVO: 'DISCOUNT_FIXED',
  VIP: 'DISCOUNT_FIXED',
};

export interface Customer {
  id: string;
  name: string;
  taxId: string;
  email?: string;
  phone?: string;
  address?: string;
  group: CustomerGroup;
  creditLimit: number;
  currentDebt: number;
  isActive: boolean;
  creditEnabled: boolean;
}

/** El cliente de mostrador: siempre existe y no se puede editar ni borrar. */
export const PUBLIC_CUSTOMER_ID = 'default-public';

const SEED: Customer[] = [
  {
    id: PUBLIC_CUSTOMER_ID,
    name: 'Público General',
    taxId: '0',
    group: 'GENERAL',
    creditLimit: 0,
    currentDebt: 0,
    isActive: true,
    creditEnabled: false,
  },
  {
    id: 'c-1',
    name: 'Comercial Bolivia S.R.L.',
    taxId: '1029384756',
    email: 'ventas@comercialbo.com',
    phone: '+591 71234567',
    address: 'Av. Heroínas #452, Cochabamba',
    group: 'CORPORATIVO',
    creditLimit: 10000,
    currentDebt: 3450,
    isActive: true,
    creditEnabled: true,
  },
  {
    id: 'c-2',
    name: 'Tienda El Sol (Pedro Mamani)',
    taxId: '493827101',
    email: 'pmamani@gmail.com',
    phone: '+591 72345678',
    address: 'Calle Junín #120, Quillacollo',
    group: 'MAYORISTA',
    creditLimit: 5000,
    currentDebt: 4800,
    isActive: true,
    creditEnabled: true,
  },
  {
    id: 'c-3',
    name: 'Lucía Fernández',
    taxId: '5849302',
    email: 'lucia.f@hotmail.com',
    phone: '+591 73456789',
    address: 'Av. América #890, Cochabamba',
    group: 'MINORISTA',
    creditLimit: 500,
    currentDebt: 0,
    isActive: true,
    creditEnabled: false,
  },
  {
    id: 'c-4',
    name: 'Distribuidora Oriental',
    taxId: '7748192019',
    email: 'compras@distoriental.bo',
    phone: '+591 74567890',
    address: 'Av. Cristo Redentor km 4, Santa Cruz',
    group: 'MAYORISTA',
    creditLimit: 8000,
    currentDebt: 7600,
    isActive: true,
    creditEnabled: true,
  },
  {
    id: 'c-5',
    name: 'María Rodríguez',
    taxId: '4829102',
    phone: '+591 75678901',
    group: 'VIP',
    creditLimit: 0,
    currentDebt: 0,
    isActive: true,
    creditEnabled: false,
  },
];

interface CustomersState {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (id: string, patch: Partial<Omit<Customer, 'id'>>) => void;
  removeCustomer: (id: string) => boolean;
  /** ¿Hay ya otro cliente con este NIT? Devuelve el que lo ocupa. */
  taxIdOwner: (taxId: string, exceptId?: string) => Customer | undefined;
  /** Los que se pueden elegir al cobrar, en la forma que usa el punto de venta. */
  sellable: () => PosCustomer[];
}

const persist = (customers: Customer[]) => {
  writePersisted(STORAGE_KEY, customers);
  return customers;
};

/** Traduce al vocabulario del punto de venta, que cobra y calcula descuentos. */
export const toPosCustomer = (c: Customer): PosCustomer => ({
  id: c.id,
  businessName: c.name,
  taxId: c.taxId,
  group: c.group === 'MAYORISTA' ? 'MAYORISTA' : c.group === 'VIP' ? 'VIP' : 'GENERAL',
  discountPercentage: GROUP_DISCOUNT[c.group],
  creditLimit: c.creditEnabled ? c.creditLimit : 0,
  currentDebt: c.currentDebt,
});

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: readPersisted<Customer[]>(STORAGE_KEY) ?? SEED,

  addCustomer: (customer) => {
    const created: Customer = { ...customer, id: localId('c') };
    set((state) => ({ customers: persist([...state.customers, created]) }));
    return created;
  },

  updateCustomer: (id, patch) =>
    set((state) => ({
      customers: persist(state.customers.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    })),

  removeCustomer: (id) => {
    /* El cliente de mostrador es la opción por defecto del cobro: sin él, el
       punto de venta se queda sin a quién facturar. */
    if (id === PUBLIC_CUSTOMER_ID) return false;
    set((state) => ({ customers: persist(state.customers.filter((c) => c.id !== id)) }));
    return true;
  },

  taxIdOwner: (taxId, exceptId) => {
    const clean = taxId.trim();
    if (clean === '' || clean === '0') return undefined;
    return get().customers.find((c) => c.taxId.trim() === clean && c.id !== exceptId);
  },

  sellable: () =>
    get()
      .customers.filter((c) => c.isActive)
      .map(toPosCustomer),
}));

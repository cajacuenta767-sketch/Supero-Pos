import type { CartItem } from '../store/useCartStore';
import type { BlockCPaymentItem } from '../db/sqlite';

/**
 * Impresión del ticket desde la terminal.
 *
 * Antes no existía: el proceso principal tenía un manejador IPC y ninguna parte
 * de la interfaz lo llamaba, así que el camino estaba desconectado de punta a
 * punta. El botón de imprimir etiquetas tampoco tenía acción.
 */

export interface TicketPayment {
  method: BlockCPaymentItem['payment_method'];
  amountReceived: number;
  changeGiven: number;
}

export interface TicketData {
  ticketNumber: string;
  dateText: string;
  companyName: string;
  companyNit: string;
  branchName?: string;
  cashierName?: string;
  customerName?: string;
  paperWidth: '80mm' | '58mm';
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    serials?: string[];
  }>;
  subtotal: number;
  discount: number;
  total: number;
  payments: TicketPayment[];
  footerText?: string;
}

interface PrinterBridge {
  printTicket: (ticket: TicketData) => Promise<{ success: boolean; target?: string }>;
  printLabels: (job: LabelJob) => Promise<{ success: boolean }>;
  openDrawer: () => Promise<{ success: boolean }>;
  probe: () => Promise<{ available: boolean; reason?: string; target?: string }>;
}

interface SuperoBridge {
  printer: PrinterBridge;
}

const bridge = (): SuperoBridge | undefined =>
  (window as Window & { superoPos?: SuperoBridge }).superoPos;

/** Fuera de Electron no hay impresora: en el navegador se dice, no se finge. */
export const isPrintingAvailable = (): boolean => Boolean(bridge()?.printer);

export const cartItemsToTicketLines = (items: CartItem[]): TicketData['items'] =>
  items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    subtotal: item.subtotal,
    serials: item.selected_serials?.length ? item.selected_serials : undefined,
  }));

export interface PrintOutcome {
  printed: boolean;
  reason?: string;
}

/**
 * Imprime el ticket y devuelve qué ocurrió de verdad.
 *
 * Nunca lanza: un fallo de impresora no debe tumbar un cobro que ya está
 * registrado en la base local. Quien llama decide cómo avisar.
 */
export const printSaleTicket = async (ticket: TicketData): Promise<PrintOutcome> => {
  const printer = bridge()?.printer;
  if (!printer) {
    return {
      printed: false,
      reason: 'La impresión solo está disponible en la terminal de escritorio.',
    };
  }

  try {
    await printer.printTicket(ticket);
    return { printed: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { printed: false, reason };
  }
};

export const openCashDrawer = async (): Promise<PrintOutcome> => {
  const printer = bridge()?.printer;
  if (!printer) return { printed: false, reason: 'Sin cajón conectado en modo navegador.' };
  try {
    await printer.openDrawer();
    return { printed: true };
  } catch (err) {
    return { printed: false, reason: err instanceof Error ? err.message : String(err) };
  }
};

export interface LabelJob {
  productName: string;
  sku: string;
  barcode: string;
  price: number;
  copies: number;
  labelSize: '50x25' | '40x20';
}

/**
 * Imprime etiquetas de estantería con su código de barras.
 *
 * El código va como EAN-13 real generado por la impresora (`GS k`), no como
 * dibujo: lo que se pega en el estante tiene que poder escanearse.
 */
export const printProductLabels = async (job: LabelJob): Promise<PrintOutcome> => {
  const printer = bridge()?.printer;
  if (!printer) {
    return {
      printed: false,
      reason: 'La impresión solo está disponible en la terminal de escritorio.',
    };
  }
  try {
    await printer.printLabels(job);
    return { printed: true };
  } catch (err) {
    return { printed: false, reason: err instanceof Error ? err.message : String(err) };
  }
};

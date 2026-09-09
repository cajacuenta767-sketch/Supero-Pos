/**
 * Tipos del compositor ESC/POS.
 *
 * El módulo es CommonJS porque lo carga el proceso principal de Electron, pero
 * las pruebas del renderer lo importan: sin declaración, TypeScript lo trataría
 * como `any` y las pruebas dejarían de comprobar la forma de los datos.
 */

export interface TicketItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  serials?: string[];
}

export interface TicketPayment {
  method: 'CASH' | 'CARD' | 'QR' | 'MIXED';
  amountReceived: number;
  changeGiven: number;
}

export interface TicketInput {
  companyName?: string;
  companyNit?: string;
  branchName?: string;
  ticketNumber?: string;
  dateText?: string;
  cashierName?: string;
  customerName?: string;
  paperWidth?: '80mm' | '58mm';
  items?: TicketItem[];
  subtotal?: number;
  discount?: number;
  total?: number;
  payments?: TicketPayment[];
  footerText?: string;
}

export interface LabelInput {
  productName: string;
  sku: string;
  barcode: string;
  price: number;
  copies: number;
  labelSize: '50x25' | '40x20';
}

export declare const LINE_WIDTH: Record<'80mm' | '58mm', number>;
export declare const PAYMENT_LABEL: Record<string, string>;
export declare const ESC_POS: Record<string, Buffer>;
export declare function buildTicket(ticket: TicketInput): Buffer;
export declare function buildLabels(job: LabelInput): Buffer;
export declare function buildDrawerKick(): Buffer;
export declare function twoColumns(left: string, right: string, width: number): string;
export declare function center(text: string, width: number): string;

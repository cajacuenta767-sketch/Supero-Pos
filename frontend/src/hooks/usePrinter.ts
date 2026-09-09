import { useCallback } from 'react';

export interface PrintableTicket {
  ticketNumber: string;
  dateTime: string;
  cashierName: string;
  items: Array<{ name: string; qty: number; price: number; subtotal: number }>;
  totalAmount: number;
}

export const usePrinter = () => {
  const printTicket = useCallback((ticket: PrintableTicket, paperWidth: '80mm' | '58mm' = '80mm') => {
    console.log(`[ESC/POS Printer] Printing ticket #${ticket.ticketNumber} on ${paperWidth} paper...`);
    // ESC/POS raw printer command builder trigger via Electron IPC
    if (window.electronAPI) {
      window.electronAPI.printThermalTicket({ ticket, paperWidth });
    } else {
      window.print();
    }
  }, []);

  return { printTicket };
};

declare global {
  interface Window {
    electronAPI?: {
      printThermalTicket: (payload: any) => void;
    };
  }
}

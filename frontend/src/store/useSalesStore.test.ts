import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSalesStore } from './useSalesStore';
import type { SaleTicket } from './useSalesStore';

const ticket = (id: string): Omit<SaleTicket, 'status'> => ({
  id,
  at: new Date().toISOString(),
  cashier_name: 'Ana Rojas',
  payment_method: 'CASH',
  total: 24,
  cash_given: 30,
  change: 6,
  items: [
    {
      id: 107,
      sku: 'BEB-COL-007',
      name: 'Coca Cola 2 Litros Retornable',
      quantity: 2,
      unit_price: 12,
      subtotal: 24,
      unit_type: 'UNIT',
    },
  ],
});

describe('useSalesStore', () => {
  // localStorage no existe en Node: la persistencia se hace inerte para la prueba.
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    useSalesStore.setState({ tickets: [] });
  });

  it('registra la venta como completada y la deja la primera', () => {
    useSalesStore.getState().recordSale(ticket('TK-1'));
    const saved = useSalesStore.getState().recordSale(ticket('TK-2'));

    expect(saved.status).toBe('COMPLETED');
    expect(useSalesStore.getState().tickets.map((t) => t.id)).toEqual(['TK-2', 'TK-1']);
  });

  it('persiste lo registrado', () => {
    useSalesStore.getState().recordSale(ticket('TK-3'));
    expect(localStorage.getItem('supero_pos_data_tickets')).toContain('TK-3');
  });

  it('anula dejando motivo, autor e instante', () => {
    useSalesStore.getState().recordSale(ticket('TK-4'));
    const voided = useSalesStore.getState().voidTicket('TK-4', 'Cobro duplicado', 'Ana Rojas');

    expect(voided?.status).toBe('CANCELLED');
    expect(voided?.cancellation_reason).toBe('Cobro duplicado');
    expect(voided?.cancelled_by).toBe('Ana Rojas');
    expect(voided?.cancelled_at).toBeTruthy();
    expect(useSalesStore.getState().ticketById('TK-4')?.status).toBe('CANCELLED');
  });

  it('no anula dos veces: devolvería la mercancía dos veces', () => {
    useSalesStore.getState().recordSale(ticket('TK-5'));
    expect(useSalesStore.getState().voidTicket('TK-5', 'Error', 'Ana')).not.toBeNull();
    expect(useSalesStore.getState().voidTicket('TK-5', 'Error otra vez', 'Ana')).toBeNull();
  });

  it('ignora la anulación de un ticket que no existe', () => {
    expect(useSalesStore.getState().voidTicket('TK-NADA', 'Motivo', 'Ana')).toBeNull();
  });

  it('conserva las líneas con su identificador de catálogo, que es lo que permite devolverlas', () => {
    const saved = useSalesStore.getState().recordSale(ticket('TK-6'));
    expect(saved.items[0].id).toBe(107);
    expect(saved.items[0].quantity).toBe(2);
  });
});

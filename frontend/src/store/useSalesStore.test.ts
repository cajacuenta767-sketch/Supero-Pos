import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSalesStore } from './useSalesStore';
import type { SaleTicket } from './useSalesStore';

const ticket = (id: string): Omit<SaleTicket, 'status'> => ({
  id,
  at: new Date().toISOString(),
  cashier_name: 'Ana Rojas',
  payment_method: 'CASH',
  payments: [{ method: 'CASH', amount_received: 30, change_given: 6 }],
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

  describe('efectivo del turno', () => {
    const conPagos = (id: string, at: string, pagos: SaleTicket['payments']) => {
      const t = { ...ticket(id), at, payments: pagos };
      return useSalesStore.getState().recordSale(t);
    };

    it('suma lo recibido menos el cambio, solo del efectivo', () => {
      conPagos('TK-A', '2026-09-09T10:00:00.000Z', [
        { method: 'CASH', amount_received: 100, change_given: 26 },
      ]);
      conPagos('TK-B', '2026-09-09T11:00:00.000Z', [
        { method: 'QR', amount_received: 50, change_given: 0 },
      ]);
      expect(useSalesStore.getState().cashSince('2026-09-09T00:00:00.000Z')).toBe(74);
    });

    it('de un ticket mixto cuenta solo la parte en efectivo', () => {
      conPagos('TK-C', '2026-09-09T12:00:00.000Z', [
        { method: 'CASH', amount_received: 40, change_given: 5 },
        { method: 'CARD', amount_received: 60, change_given: 0 },
      ]);
      expect(useSalesStore.getState().cashSince('2026-09-09T00:00:00.000Z')).toBe(35);
    });

    it('ignora lo cobrado antes de abrir el turno', () => {
      conPagos('TK-D', '2026-09-08T20:00:00.000Z', [
        { method: 'CASH', amount_received: 500, change_given: 0 },
      ]);
      conPagos('TK-E', '2026-09-09T09:00:00.000Z', [
        { method: 'CASH', amount_received: 20, change_given: 0 },
      ]);
      expect(useSalesStore.getState().cashSince('2026-09-09T08:00:00.000Z')).toBe(20);
    });

    it('un ticket anulado deja de contar: su dinero volvió al cliente', () => {
      conPagos('TK-F', '2026-09-09T10:00:00.000Z', [
        { method: 'CASH', amount_received: 90, change_given: 0 },
      ]);
      expect(useSalesStore.getState().cashSince('2026-09-09T00:00:00.000Z')).toBe(90);
      useSalesStore.getState().voidTicket('TK-F', 'Cobro duplicado', 'Ana');
      expect(useSalesStore.getState().cashSince('2026-09-09T00:00:00.000Z')).toBe(0);
    });
  });
});

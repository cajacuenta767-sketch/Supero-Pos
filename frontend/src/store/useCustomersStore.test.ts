import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomersStore, PUBLIC_CUSTOMER_ID, toPosCustomer } from './useCustomersStore';
import type { Customer } from './useCustomersStore';

const nuevo = (name: string, taxId: string): Omit<Customer, 'id'> => ({
  name,
  taxId,
  group: 'MINORISTA',
  creditLimit: 0,
  currentDebt: 0,
  isActive: true,
  creditEnabled: false,
});

describe('useCustomersStore', () => {
  // localStorage no existe en Node: la persistencia se hace inerte para la prueba.
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    useCustomersStore.setState({
      customers: [
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
      ],
    });
  });

  it('da de alta y persiste', () => {
    const creado = useCustomersStore.getState().addCustomer(nuevo('Tienda El Sol', '493827101'));
    expect(creado.id).toMatch(/^c-/);
    expect(useCustomersStore.getState().customers).toHaveLength(2);
    expect(localStorage.getItem('supero_pos_data_clientes')).toContain('Tienda El Sol');
  });

  it('detecta el NIT repetido: dos fichas para la misma empresa descuadran las cuentas', () => {
    useCustomersStore.getState().addCustomer(nuevo('Tienda El Sol', '493827101'));
    expect(useCustomersStore.getState().taxIdOwner('493827101')?.name).toBe('Tienda El Sol');
    expect(useCustomersStore.getState().taxIdOwner(' 493827101 ')?.name).toBe('Tienda El Sol');
    expect(useCustomersStore.getState().taxIdOwner('999')).toBeUndefined();
  });

  it('no considera repetido el «0» del consumidor final', () => {
    expect(useCustomersStore.getState().taxIdOwner('0')).toBeUndefined();
    expect(useCustomersStore.getState().taxIdOwner('')).toBeUndefined();
  });

  it('al editar, no se acusa a sí mismo de repetir su propio NIT', () => {
    const c = useCustomersStore.getState().addCustomer(nuevo('Tienda El Sol', '493827101'));
    expect(useCustomersStore.getState().taxIdOwner('493827101', c.id)).toBeUndefined();
  });

  it('no borra el cliente de mostrador: el cobro se quedaría sin a quién facturar', () => {
    expect(useCustomersStore.getState().removeCustomer(PUBLIC_CUSTOMER_ID)).toBe(false);
    const c = useCustomersStore.getState().addCustomer(nuevo('Lucía', '58493'));
    expect(useCustomersStore.getState().removeCustomer(c.id)).toBe(true);
  });

  it('traduce al punto de venta con el descuento del grupo', () => {
    const vip = toPosCustomer({ ...nuevo('María', '4829102'), id: 'c-9', group: 'VIP' });
    expect(vip.discountPercentage).toBe(5);
    expect(vip.group).toBe('VIP');

    const mayorista = toPosCustomer({ ...nuevo('El Sol', '4938'), id: 'c-8', group: 'MAYORISTA' });
    expect(mayorista.discountPercentage).toBe(0);
    expect(mayorista.group).toBe('MAYORISTA');
  });

  it('sin crédito habilitado, el límite que ve el cobro es cero', () => {
    const sinCredito = toPosCustomer({
      ...nuevo('El Sol', '4938'),
      id: 'c-7',
      creditLimit: 5000,
      creditEnabled: false,
    });
    expect(sinCredito.creditLimit).toBe(0);
  });

  it('solo ofrece al cobro los clientes activos', () => {
    useCustomersStore.getState().addCustomer(nuevo('Activo', '111'));
    const baja = useCustomersStore.getState().addCustomer(nuevo('De baja', '222'));
    useCustomersStore.getState().updateCustomer(baja.id, { isActive: false });

    const nombres = useCustomersStore
      .getState()
      .sellable()
      .map((c) => c.businessName);
    expect(nombres).toContain('Activo');
    expect(nombres).not.toContain('De baja');
  });
});

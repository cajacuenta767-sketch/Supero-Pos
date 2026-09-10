import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCatalogStore } from './useCatalogStore';

// localStorage no existe en Node: la persistencia se hace inerte para la prueba.
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });

  useCatalogStore.setState({
    products: [
      {
        id: 1,
        sku: 'A-1',
        barcode: '7770000000001',
        name: 'Leche entera',
        category: 'Abarrotes',
        unit_type: 'UNIT',
        cost_price: 6,
        sale_price: 8.5,
        wholesale_price: 7.5,
        wholesale_min_qty: 12,
        stock: 10,
        min_stock: 5,
        is_active: true,
      },
      {
        id: 2,
        sku: 'A-2',
        barcode: '7770000000002',
        name: 'Queso a granel',
        category: 'Lácteos',
        unit_type: 'FRACTION',
        cost_price: 32,
        sale_price: 45,
        wholesale_price: 40,
        wholesale_min_qty: 5,
        stock: 4.5,
        min_stock: 2,
        is_active: true,
      },
    ],
    movements: [],
  });
});

const stockOf = (id: number) => useCatalogStore.getState().products.find((p) => p.id === id)!.stock;

describe('el stock sube y baja según la operación', () => {
  it('la venta descuenta', () => {
    useCatalogStore.getState().applyMovement({ productId: 1, type: 'SALE', quantity: -3 });
    expect(stockOf(1)).toBe(7);
  });

  it('la recepción de compra suma', () => {
    useCatalogStore.getState().applyMovement({ productId: 1, type: 'PURCHASE', quantity: 24 });
    expect(stockOf(1)).toBe(34);
  });

  it('la merma descuenta', () => {
    useCatalogStore.getState().applyMovement({ productId: 1, type: 'LOSS', quantity: -2 });
    expect(stockOf(1)).toBe(8);
  });

  it('la salida por traslado descuenta y la entrada repone', () => {
    useCatalogStore.getState().applyMovement({ productId: 1, type: 'TRANSFER_OUT', quantity: -4 });
    expect(stockOf(1)).toBe(6);
    useCatalogStore.getState().applyMovement({ productId: 1, type: 'TRANSFER_IN', quantity: 4 });
    expect(stockOf(1)).toBe(10);
  });

  it('el ajuste de auditoría lleva al conteo físico', () => {
    useCatalogStore.getState().applyMovement({ productId: 1, type: 'AUDIT', quantity: -1.5 });
    expect(stockOf(1)).toBe(8.5);
  });
});

describe('cantidades decimales del granel', () => {
  it('no arrastra error de coma flotante', () => {
    const store = useCatalogStore.getState();
    store.applyMovement({ productId: 2, type: 'SALE', quantity: -0.45 });
    store.applyMovement({ productId: 2, type: 'SALE', quantity: -0.15 });
    expect(stockOf(2)).toBe(3.9);
  });
});

describe('asientos', () => {
  it('cada movimiento deja el antes y el después', () => {
    useCatalogStore
      .getState()
      .applyMovement({ productId: 1, type: 'SALE', quantity: -3, reference: 'TK-1042' });

    const [movement] = useCatalogStore.getState().movements;
    expect(movement).toMatchObject({
      productId: 1,
      productName: 'Leche entera',
      type: 'SALE',
      quantity: -3,
      stockBefore: 10,
      stockAfter: 7,
      reference: 'TK-1042',
    });
  });

  it('el más reciente va primero', () => {
    const store = useCatalogStore.getState();
    store.applyMovement({ productId: 1, type: 'SALE', quantity: -1, reference: 'primero' });
    store.applyMovement({ productId: 1, type: 'SALE', quantity: -1, reference: 'segundo' });
    expect(useCatalogStore.getState().movements[0].reference).toBe('segundo');
  });

  it('varias líneas se aplican como una sola operación', () => {
    const recorded = useCatalogStore.getState().applyMovements([
      { productId: 1, type: 'PURCHASE', quantity: 10, reference: 'PO-1' },
      { productId: 2, type: 'PURCHASE', quantity: 5, reference: 'PO-1' },
    ]);

    expect(recorded).toHaveLength(2);
    expect(stockOf(1)).toBe(20);
    expect(stockOf(2)).toBe(9.5);
  });

  it('los asientos de un producto se pueden consultar por separado', () => {
    const store = useCatalogStore.getState();
    store.applyMovement({ productId: 1, type: 'SALE', quantity: -1 });
    store.applyMovement({ productId: 2, type: 'SALE', quantity: -1 });
    expect(useCatalogStore.getState().movementsFor(1)).toHaveLength(1);
  });
});

describe('casos que no deben romper nada', () => {
  it('un producto inexistente no crea existencias de la nada', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const recorded = useCatalogStore
      .getState()
      .applyMovement({ productId: 999, type: 'PURCHASE', quantity: 5 });

    expect(recorded).toBeNull();
    expect(useCatalogStore.getState().products).toHaveLength(2);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('el stock negativo se registra y se avisa: la operación ya ocurrió', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useCatalogStore.getState().applyMovement({ productId: 1, type: 'SALE', quantity: -15 });

    expect(stockOf(1)).toBe(-5);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Stock negativo'));
    warn.mockRestore();
  });
});

describe('duplicateOf', () => {
  beforeEach(() => {
    useCatalogStore.setState({
      products: [
        {
          id: 1,
          sku: 'AB-001',
          barcode: '7770000000001',
          name: 'Leche entera',
          category: 'Abarrotes',
          unit_type: 'UNIT',
          cost_price: 6,
          sale_price: 8.5,
          wholesale_price: 7.5,
          wholesale_min_qty: 12,
          stock: 10,
          min_stock: 4,
          is_active: true,
        },
      ],
    });
  });

  it('detecta el SKU repetido, sin distinguir mayúsculas ni espacios', () => {
    expect(useCatalogStore.getState().duplicateOf({ sku: ' ab-001 ', barcode: '999' })?.field).toBe(
      'sku',
    );
  });

  it('detecta el código de barras repetido: el escáner cobraría el otro producto', () => {
    const clash = useCatalogStore
      .getState()
      .duplicateOf({ sku: 'NUEVO', barcode: '7770000000001' });
    expect(clash?.field).toBe('barcode');
    expect(clash?.product.name).toBe('Leche entera');
  });

  it('al editar, un producto no se acusa a sí mismo', () => {
    expect(
      useCatalogStore.getState().duplicateOf({ sku: 'AB-001', barcode: '7770000000001' }, 1),
    ).toBeUndefined();
  });

  it('un SKU o un código vacíos no cuentan como repetidos', () => {
    expect(useCatalogStore.getState().duplicateOf({ sku: '', barcode: '' })).toBeUndefined();
  });

  it('deja pasar lo que de verdad es nuevo', () => {
    expect(
      useCatalogStore.getState().duplicateOf({ sku: 'AB-002', barcode: '7770000000002' }),
    ).toBeUndefined();
  });
});

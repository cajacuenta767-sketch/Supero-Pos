import { beforeEach, describe, expect, it } from 'vitest';
import { lineKey, useCartStore } from './useCartStore';

const PHONE = {
  id: 101,
  sku: 'ELE-S23-001',
  barcode: '7750123456789',
  name: 'Smartphone Galaxy S23 Ultra',
  unit_type: 'SERIALIZED' as const,
  retail_price: 850,
  wholesale_price: 800,
  wholesale_min_qty: 3,
};

const CHEESE = {
  id: 102,
  sku: 'AB-QSO-002',
  barcode: '7759876543210',
  name: 'Queso Criollo (a granel)',
  unit_type: 'FRACTION' as const,
  retail_price: 45,
  wholesale_price: 40,
  wholesale_min_qty: 5,
};

const reset = () =>
  useCartStore.setState({
    items: [],
    customerDiscountPercentage: 0,
    manualDiscountPercentage: 0,
    paymentMethod: 'CASH',
    cashGiven: 0,
    cashAmount: 0,
    cardAmount: 0,
    qrAmount: 0,
  });

beforeEach(reset);

describe('el ticket arranca vacío', () => {
  it('no trae productos de demostración', () => {
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().getSubtotal()).toBe(0);
  });
});

describe('identidad de línea con productos serializados', () => {
  it('crea una línea por número de serie', () => {
    const { addItem } = useCartStore.getState();
    addItem(PHONE, 1, '358492019482717');
    addItem(PHONE, 1, '358492019482725');

    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('borrar una línea no arrastra a la otra del mismo producto', () => {
    const { addItem } = useCartStore.getState();
    addItem(PHONE, 1, '358492019482717');
    addItem(PHONE, 1, '358492019482725');

    useCartStore.getState().removeItem(lineKey(101, '358492019482717'));

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].serial_number).toBe('358492019482725');
  });

  it('cambiar la cantidad afecta solo a su línea', () => {
    const { addItem } = useCartStore.getState();
    addItem(PHONE, 1, '358492019482717');
    addItem(PHONE, 1, '358492019482725');

    useCartStore.getState().updateQuantity(lineKey(101, '358492019482717'), 2);

    const items = useCartStore.getState().items;
    expect(items.find((i) => i.serial_number === '358492019482717')?.quantity).toBe(2);
    expect(items.find((i) => i.serial_number === '358492019482725')?.quantity).toBe(1);
  });
});

describe('aritmética de importes', () => {
  it('calcula el subtotal de granel sin error de coma flotante', () => {
    useCartStore.getState().addItem(CHEESE, 0.45);
    expect(useCartStore.getState().getSubtotal()).toBe(20.25);
  });

  it('suma varias líneas exactamente', () => {
    const { addItem } = useCartStore.getState();
    addItem(PHONE, 1, 'A');
    addItem(CHEESE, 0.45);
    expect(useCartStore.getState().getSubtotal()).toBe(870.25);
  });

  it('aplica el descuento manual sobre el resto, no sobre el bruto', () => {
    useCartStore.getState().addItem(CHEESE, 2); // 90,00
    useCartStore.getState().setDiscounts(10, 10);

    // 10 % de 90 = 9; luego 10 % de 81 = 8,10. Total descontado 17,10.
    expect(useCartStore.getState().getDiscountAmount()).toBe(17.1);
    expect(useCartStore.getState().getTotal()).toBe(72.9);
  });
});

describe('los descuentos vigentes se respetan al elegir método de pago', () => {
  it('«Efectivo» precarga el total ya descontado', () => {
    useCartStore.getState().addItem(CHEESE, 2); // 90,00
    useCartStore.getState().setDiscounts(10, 0);

    useCartStore.getState().setPaymentMethod('CASH');

    // Antes precargaba 90: getTotal() se llamaba sin descuentos.
    expect(useCartStore.getState().cashGiven).toBe(81);
    expect(useCartStore.getState().getChange()).toBe(0);
  });

  it('con tarjeta no da por cobrado el importe sin descontar', () => {
    useCartStore.getState().addItem(CHEESE, 2);
    useCartStore.getState().setDiscounts(10, 0);

    useCartStore.getState().setPaymentMethod('CARD');

    expect(useCartStore.getState().getTotalPaid()).toBe(81);
    expect(useCartStore.getState().isPaymentCovered()).toBe(true);
  });
});

describe('cobertura del pago', () => {
  it('un céntimo de menos no cubre la venta', () => {
    useCartStore.getState().addItem(CHEESE, 2); // 90,00
    useCartStore.getState().setPaymentMethod('CASH');
    useCartStore.getState().setCashGiven(89.99);

    // Antes la tolerancia de 0,001 tapaba el error de los flotantes; ahora la
    // comparación es exacta porque se hace en enteros.
    expect(useCartStore.getState().isPaymentCovered()).toBe(false);
  });

  it('el importe exacto cubre la venta y no genera vuelto', () => {
    useCartStore.getState().addItem(CHEESE, 0.45);
    useCartStore.getState().setPaymentMethod('CASH');
    useCartStore.getState().setCashGiven(20.25);

    expect(useCartStore.getState().isPaymentCovered()).toBe(true);
    expect(useCartStore.getState().getChange()).toBe(0);
  });

  it('calcula el vuelto sin arrastrar decimales', () => {
    useCartStore.getState().addItem(CHEESE, 0.45); // 20,25
    useCartStore.getState().setPaymentMethod('CASH');
    useCartStore.getState().setCashGiven(50);

    expect(useCartStore.getState().getChange()).toBe(29.75);
  });
});

describe('precio mayorista', () => {
  it('se activa al alcanzar la cantidad mínima', () => {
    useCartStore.getState().addItem(PHONE, 3);
    const item = useCartStore.getState().items[0];
    expect(item.is_wholesale_applied).toBe(true);
    expect(item.unit_price).toBe(800);
    expect(useCartStore.getState().getSubtotal()).toBe(2400);
  });

  it('por debajo del mínimo mantiene el precio público', () => {
    useCartStore.getState().addItem(PHONE, 2);
    expect(useCartStore.getState().items[0].unit_price).toBe(850);
  });
});

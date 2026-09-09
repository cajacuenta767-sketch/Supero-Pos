import { create } from 'zustand';
import { fromCents, lineTotalCents, percentOf, sumCents, toCents } from '../utils/money';
import type { Product as CatalogProduct } from './useCatalogStore';

/**
 * Identidad de una línea del ticket.
 *
 * Un producto serializado genera una línea por número de serie, todas con el
 * mismo `id`. Los mutadores operaban solo por `id`, así que cambiar la cantidad
 * de un teléfono o borrarlo actuaba sobre todas sus líneas a la vez.
 */
export const lineKey = (id: number, serial?: string | null): string => `${id}::${serial ?? ''}`;

export interface CartItem {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
  retail_price: number;
  wholesale_price: number;
  wholesale_min_qty: number;
  unit_price: number; // Applied price (retail or wholesale)
  is_wholesale_applied: boolean;
  quantity: number; // Decimal support (e.g. 0.450 kg)
  serial_number?: string | null;
  selected_serials?: string[];
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  /**
   * Descuentos vigentes, en porcentaje.
   *
   * Antes vivían solo en `usePosStore`, así que el carrito no sabía calcular su
   * propio total: `setPaymentMethod` y `getTotalPaid` llamaban a `getTotal()`
   * sin argumentos y obtenían el importe **sin descontar**. Con un cliente VIP,
   * elegir «Efectivo» precargaba de más y el vuelto salía mal.
   */
  customerDiscountPercentage: number;
  manualDiscountPercentage: number;
  paymentMethod: 'CASH' | 'CARD' | 'QR' | 'MIXED';
  cashGiven: number;
  cashAmount: number;
  cardAmount: number;
  qrAmount: number;

  // Actions
  /** Acepta el producto tal y como vive en el catálogo compartido. */
  addItem: (product: CatalogProduct, quantity?: number, serial_number?: string | null) => void;
  updateQuantity: (key: string, quantity: number) => void;
  updateItemSerial: (key: string, serial_number: string) => void;
  removeItem: (key: string) => void;
  setDiscounts: (customerPercentage: number, manualPercentage: number) => void;
  setPaymentMethod: (method: 'CASH' | 'CARD' | 'QR' | 'MIXED') => void;
  setCashGiven: (amount: number) => void;
  setMixedAmounts: (cash: number, card: number, qr: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  /** Sin argumentos usa los descuentos vigentes del propio carrito. */
  getTotal: (customerDiscountPercentage?: number, manualDiscountPercentage?: number) => number;
  getDiscountAmount: (
    customerDiscountPercentage?: number,
    manualDiscountPercentage?: number,
  ) => number;
  getTotalPaid: () => number;
  getChange: (customerDiscountPercentage?: number, manualDiscountPercentage?: number) => number;
  isPaymentCovered: (
    customerDiscountPercentage?: number,
    manualDiscountPercentage?: number,
  ) => boolean;
}

export const useCartStore = create<CartState>((set, get) => ({
  /* Arranca vacío. Antes traía dos productos de demostración en el estado
     inicial, así que la terminal abría con un ticket a medio hacer. */
  items: [],
  customerDiscountPercentage: 0,
  manualDiscountPercentage: 0,
  paymentMethod: 'CASH',
  cashGiven: 0,
  cashAmount: 0,
  cardAmount: 0,
  qrAmount: 0,

  addItem: (product, quantity = 1, serial_number = null) =>
    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) => i.id === product.id && i.serial_number === serial_number,
      );

      /* En el catálogo el precio al público se llama `sale_price`; dentro del
         ticket se conserva como `retail_price`, que es el vocabulario del
         carrito. La traducción vive aquí y en ningún otro sitio. */
      const retailPrice = product.sale_price;
      const wholesalePrice = product.wholesale_price || retailPrice;
      const wholesaleMinQty = product.wholesale_min_qty || 10;

      if (existingIndex > -1) {
        const updatedItems = [...state.items];
        const existing = updatedItems[existingIndex];
        const newQty = existing.quantity + quantity;

        // Automatic Wholesale Price Trigger
        const isWholesale = wholesalePrice > 0 && newQty >= wholesaleMinQty;
        const effectivePrice = isWholesale ? wholesalePrice : retailPrice;

        const newSerials = serial_number
          ? [...(existing.selected_serials || []), serial_number]
          : existing.selected_serials || [];

        updatedItems[existingIndex] = {
          ...existing,
          quantity: newQty,
          unit_price: effectivePrice,
          is_wholesale_applied: isWholesale,
          selected_serials: newSerials,
          subtotal: fromCents(lineTotalCents(newQty, toCents(effectivePrice))),
        };
        return { items: updatedItems };
      }

      const isWholesale = wholesalePrice > 0 && quantity >= wholesaleMinQty;
      const effectivePrice = isWholesale ? wholesalePrice : retailPrice;

      const newItem: CartItem = {
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        unit_type: product.unit_type,
        retail_price: retailPrice,
        wholesale_price: wholesalePrice,
        wholesale_min_qty: wholesaleMinQty,
        unit_price: effectivePrice,
        is_wholesale_applied: isWholesale,
        quantity,
        serial_number,
        selected_serials: serial_number ? [serial_number] : [],
        subtotal: fromCents(lineTotalCents(quantity, toCents(effectivePrice))),
      };
      return { items: [...state.items, newItem] };
    }),

  updateQuantity: (key, quantity) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (lineKey(item.id, item.serial_number) !== key) return item;
        const validQty = Math.max(0.001, quantity);
        const isWholesale = item.wholesale_price > 0 && validQty >= item.wholesale_min_qty;
        const effectivePrice = isWholesale ? item.wholesale_price : item.retail_price;
        return {
          ...item,
          quantity: validQty,
          unit_price: effectivePrice,
          is_wholesale_applied: isWholesale,
          subtotal: fromCents(lineTotalCents(validQty, toCents(effectivePrice))),
        };
      }),
    })),

  updateItemSerial: (key, serial_number) =>
    set((state) => ({
      items: state.items.map((item) =>
        lineKey(item.id, item.serial_number) === key
          ? { ...item, serial_number, selected_serials: [serial_number] }
          : item,
      ),
    })),

  removeItem: (key) =>
    set((state) => ({
      items: state.items.filter((item) => lineKey(item.id, item.serial_number) !== key),
    })),

  setDiscounts: (customerPercentage, manualPercentage) =>
    set({
      customerDiscountPercentage: Math.min(100, Math.max(0, customerPercentage)),
      manualDiscountPercentage: Math.min(100, Math.max(0, manualPercentage)),
    }),

  setPaymentMethod: (paymentMethod) =>
    set(() => {
      const total = get().getTotal();
      if (paymentMethod === 'CASH') {
        return { paymentMethod, cashGiven: total, cashAmount: total, cardAmount: 0, qrAmount: 0 };
      }
      if (paymentMethod === 'CARD') {
        return { paymentMethod, cashGiven: 0, cashAmount: 0, cardAmount: total, qrAmount: 0 };
      }
      if (paymentMethod === 'QR') {
        return { paymentMethod, cashGiven: 0, cashAmount: 0, cardAmount: 0, qrAmount: total };
      }
      return { paymentMethod };
    }),

  setCashGiven: (amount) =>
    set((state) => ({
      cashGiven: amount,
      cashAmount: state.paymentMethod === 'CASH' ? amount : state.cashAmount,
    })),

  setMixedAmounts: (cash, card, qr) =>
    set({
      cashAmount: cash,
      cardAmount: card,
      qrAmount: qr,
      cashGiven: cash,
    }),

  clearCart: () =>
    set({
      items: [],
      cashGiven: 0,
      cashAmount: 0,
      cardAmount: 0,
      qrAmount: 0,
    }),

  getSubtotal: () => {
    return fromCents(sumCents(get().items.map((item) => toCents(item.subtotal))));
  },

  getDiscountAmount: (customerDiscountPercentage, manualDiscountPercentage) => {
    const state = get();
    const customerPct = customerDiscountPercentage ?? state.customerDiscountPercentage;
    const manualPct = manualDiscountPercentage ?? state.manualDiscountPercentage;

    const subtotalCents = sumCents(state.items.map((item) => toCents(item.subtotal)));
    // El descuento manual se aplica sobre lo que queda tras el del cliente, no
    // sobre el bruto: son acumulativos, no sumables.
    const customerCents = percentOf(subtotalCents, customerPct);
    const manualCents = percentOf(subtotalCents - customerCents, manualPct);
    return fromCents(customerCents + manualCents);
  },

  getTotal: (customerDiscountPercentage, manualDiscountPercentage) => {
    const subtotalCents = toCents(get().getSubtotal());
    const discountCents = toCents(
      get().getDiscountAmount(customerDiscountPercentage, manualDiscountPercentage),
    );
    return fromCents(Math.max(0, subtotalCents - discountCents));
  },

  getTotalPaid: () => {
    const { paymentMethod, cashGiven, cashAmount, cardAmount, qrAmount } = get();
    if (paymentMethod === 'CASH') return cashGiven;
    /* Antes estos dos caían a `getTotal()` sin descuentos cuando el importe era
       cero, dando por cobrado más de lo debido. */
    if (paymentMethod === 'CARD') return cardAmount || get().getTotal();
    if (paymentMethod === 'QR') return qrAmount || get().getTotal();
    return fromCents(sumCents([toCents(cashAmount), toCents(cardAmount), toCents(qrAmount)]));
  },

  getChange: (customerDiscountPercentage, manualDiscountPercentage) => {
    const totalCents = toCents(
      get().getTotal(customerDiscountPercentage, manualDiscountPercentage),
    );
    const paidCents = toCents(get().getTotalPaid());
    return fromCents(Math.max(0, paidCents - totalCents));
  },

  isPaymentCovered: (customerDiscountPercentage, manualDiscountPercentage) => {
    const totalCents = toCents(
      get().getTotal(customerDiscountPercentage, manualDiscountPercentage),
    );
    const paidCents = toCents(get().getTotalPaid());
    /* Comparación exacta: con la aritmética en enteros ya no hace falta la
       tolerancia de 0,001 que antes tapaba el error de los flotantes. */
    return paidCents >= totalCents;
  },
}));

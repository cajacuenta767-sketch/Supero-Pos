import { create } from 'zustand';

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
  paymentMethod: 'CASH' | 'CARD' | 'QR' | 'MIXED';
  cashGiven: number;
  cashAmount: number;
  cardAmount: number;
  qrAmount: number;

  // Actions
  addItem: (
    product: {
      id: number;
      sku: string;
      barcode: string;
      name: string;
      unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
      retail_price: number;
      wholesale_price?: number;
      wholesale_min_qty?: number;
    },
    quantity?: number,
    serial_number?: string | null,
  ) => void;
  updateQuantity: (id: number, quantity: number) => void;
  updateItemSerial: (id: number, serial_number: string) => void;
  removeItem: (id: number) => void;
  setPaymentMethod: (method: 'CASH' | 'CARD' | 'QR' | 'MIXED') => void;
  setCashGiven: (amount: number) => void;
  setMixedAmounts: (cash: number, card: number, qr: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
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
  items: [
    {
      id: 101,
      sku: 'ELE-S23-001',
      barcode: '7750123456789',
      name: 'Smartphone Galaxy S23 Ultra (128GB)',
      unit_type: 'SERIALIZED',
      retail_price: 850.0,
      wholesale_price: 800.0,
      wholesale_min_qty: 3,
      unit_price: 850.0,
      is_wholesale_applied: false,
      quantity: 1,
      serial_number: 'IMEI-354892019482910',
      selected_serials: ['IMEI-354892019482910'],
      subtotal: 850.0,
    },
    {
      id: 102,
      sku: 'AB-QSO-002',
      barcode: '7759876543210',
      name: 'Queso Criollo (a granel)',
      unit_type: 'FRACTION',
      retail_price: 45.0,
      wholesale_price: 40.0,
      wholesale_min_qty: 5,
      unit_price: 45.0,
      is_wholesale_applied: false,
      quantity: 0.45,
      selected_serials: [],
      subtotal: 20.25,
    },
  ],
  paymentMethod: 'CASH',
  cashGiven: 900.0,
  cashAmount: 900.0,
  cardAmount: 0,
  qrAmount: 0,

  addItem: (product, quantity = 1, serial_number = null) =>
    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) => i.id === product.id && i.serial_number === serial_number,
      );

      const wholesalePrice = product.wholesale_price || product.retail_price;
      const wholesaleMinQty = product.wholesale_min_qty || 10;

      if (existingIndex > -1) {
        const updatedItems = [...state.items];
        const existing = updatedItems[existingIndex];
        const newQty = existing.quantity + quantity;

        // Automatic Wholesale Price Trigger
        const isWholesale = wholesalePrice > 0 && newQty >= wholesaleMinQty;
        const effectivePrice = isWholesale ? wholesalePrice : product.retail_price;

        const newSerials = serial_number
          ? [...(existing.selected_serials || []), serial_number]
          : existing.selected_serials || [];

        updatedItems[existingIndex] = {
          ...existing,
          quantity: newQty,
          unit_price: effectivePrice,
          is_wholesale_applied: isWholesale,
          selected_serials: newSerials,
          subtotal: parseFloat((newQty * effectivePrice).toFixed(4)),
        };
        return { items: updatedItems };
      }

      const isWholesale = wholesalePrice > 0 && quantity >= wholesaleMinQty;
      const effectivePrice = isWholesale ? wholesalePrice : product.retail_price;

      const newItem: CartItem = {
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        unit_type: product.unit_type,
        retail_price: product.retail_price,
        wholesale_price: wholesalePrice,
        wholesale_min_qty: wholesaleMinQty,
        unit_price: effectivePrice,
        is_wholesale_applied: isWholesale,
        quantity,
        serial_number,
        selected_serials: serial_number ? [serial_number] : [],
        subtotal: parseFloat((quantity * effectivePrice).toFixed(4)),
      };
      return { items: [...state.items, newItem] };
    }),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id === id) {
          const validQty = Math.max(0.001, quantity);
          const isWholesale = item.wholesale_price > 0 && validQty >= item.wholesale_min_qty;
          const effectivePrice = isWholesale ? item.wholesale_price : item.retail_price;
          return {
            ...item,
            quantity: validQty,
            unit_price: effectivePrice,
            is_wholesale_applied: isWholesale,
            subtotal: parseFloat((validQty * effectivePrice).toFixed(4)),
          };
        }
        return item;
      }),
    })),

  updateItemSerial: (id, serial_number) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              serial_number,
              selected_serials: [serial_number],
            }
          : item,
      ),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

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
    return parseFloat(
      get()
        .items.reduce((acc, item) => acc + item.subtotal, 0)
        .toFixed(4),
    );
  },

  getDiscountAmount: (customerDiscountPercentage = 0, manualDiscountPercentage = 0) => {
    const subtotal = get().getSubtotal();
    const customerDisc = subtotal * (customerDiscountPercentage / 100);
    const remaining = subtotal - customerDisc;
    const manualDisc = remaining * (manualDiscountPercentage / 100);
    return parseFloat((customerDisc + manualDisc).toFixed(4));
  },

  getTotal: (customerDiscountPercentage = 0, manualDiscountPercentage = 0) => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscountAmount(customerDiscountPercentage, manualDiscountPercentage);
    return parseFloat(Math.max(0, subtotal - discount).toFixed(4));
  },

  getTotalPaid: () => {
    const { paymentMethod, cashGiven, cashAmount, cardAmount, qrAmount } = get();
    if (paymentMethod === 'CASH') return cashGiven;
    if (paymentMethod === 'CARD') return cardAmount || get().getTotal();
    if (paymentMethod === 'QR') return qrAmount || get().getTotal();
    return parseFloat((cashAmount + cardAmount + qrAmount).toFixed(4));
  },

  getChange: (customerDiscountPercentage = 0, manualDiscountPercentage = 0) => {
    const total = get().getTotal(customerDiscountPercentage, manualDiscountPercentage);
    const paid = get().getTotalPaid();
    return parseFloat(Math.max(0, paid - total).toFixed(4));
  },

  isPaymentCovered: (customerDiscountPercentage = 0, manualDiscountPercentage = 0) => {
    const total = get().getTotal(customerDiscountPercentage, manualDiscountPercentage);
    const paid = get().getTotalPaid();
    return paid >= total - 0.001; // tolerance for rounding
  },
}));

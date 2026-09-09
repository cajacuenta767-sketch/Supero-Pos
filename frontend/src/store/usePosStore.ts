import { create } from 'zustand';
import { verifySupervisorPin } from '../utils/supervisorPin';
import { useCartStore } from './useCartStore';
import { readPersisted, writePersisted } from './persist';

const SHIFT_KEY = 'turno_caja';

export interface Customer {
  id: string;
  businessName: string;
  taxId: string;
  group: 'GENERAL' | 'MAYORISTA' | 'VIP';
  discountPercentage: number; // e.g. VIP 5%
  /** Techo de crédito autorizado. Cero deja al cliente solo al contado. */
  creditLimit?: number;
  /** Deuda pendiente. Con el límite, decide si se le puede fiar. */
  currentDebt?: number;
}

export interface CashShift {
  id: string;
  registerId: string;
  registerName: string;
  userId: string;
  userName: string;
  initialFloat: number;
  openedAt: string;
  status: 'OPEN' | 'CLOSED';
}

export const DEFAULT_CUSTOMER: Customer = {
  id: 'default-public',
  businessName: 'Público General',
  taxId: '0',
  group: 'GENERAL',
  discountPercentage: 0,
};

interface PosState {
  cashShift: CashShift | null;
  selectedCustomer: Customer;
  manualDiscount: number; // Percentage 0-100
  pendingSyncCount: number;

  // Actions
  openCashShift: (initialFloat: number, registerId?: string, registerName?: string) => void;
  closeCashShift: (countedCash: number, notes?: string) => void;
  setCustomer: (customer: Customer) => void;
  setManualDiscount: (discount: number, pinInput?: string) => { success: boolean; message: string };
  setPendingSyncCount: (count: number) => void;
  resetPosCycle: () => void;
}

export const usePosStore = create<PosState>((set) => ({
  /* El turno es la unidad contable de la jornada. Antes vivía en estado plano:
     se cerraba la caja, se recargaba la terminal y volvía a aparecer abierto con
     los valores de demostración —y el arqueo, que calcula el efectivo esperado
     desde `openedAt`, partía de un momento equivocado. */
  cashShift: readPersisted<CashShift | null>(SHIFT_KEY) ?? {
    id: 'shift-001',
    registerId: 'caja-1',
    registerName: 'Caja 1 Principal',
    userId: 'usr-1',
    userName: 'Juan Pérez',
    initialFloat: 200.0,
    openedAt: new Date().toISOString(),
    status: 'OPEN',
  },
  selectedCustomer: DEFAULT_CUSTOMER,
  manualDiscount: 0,
  pendingSyncCount: 0,

  openCashShift: (initialFloat, registerId = 'caja-1', registerName = 'Caja 1 Principal') => {
    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      registerId,
      registerName,
      userId: 'usr-1',
      userName: 'Juan Pérez',
      initialFloat: parseFloat(initialFloat.toFixed(2)),
      openedAt: new Date().toISOString(),
      status: 'OPEN',
    };
    writePersisted(SHIFT_KEY, newShift);
    set({ cashShift: newShift });
  },

  closeCashShift: () => {
    writePersisted<CashShift | null>(SHIFT_KEY, null);
    set({ cashShift: null });
  },

  /* El carrito necesita conocer los descuentos vigentes para calcular su propio
     total: sin esto, `getTotal()` sin argumentos devolvía el importe sin
     descontar y de ahí salían el precargado de efectivo y el vuelto erróneos. */
  setCustomer: (customer) => {
    set({ selectedCustomer: customer });
    useCartStore
      .getState()
      .setDiscounts(customer.discountPercentage, useCartStore.getState().manualDiscountPercentage);
  },

  setManualDiscount: (discount, pinInput) => {
    /* Los descuentos por encima del 10 % exigen autorización. El PIN ya no vive
       en el store —era la cadena '1234' en el bundle—: la comprobación está en
       utils/supervisorPin, que es el único punto por el que pasa. */
    if (discount > 10) {
      const check = verifySupervisorPin(pinInput ?? '');
      if (!check.authorized) {
        return { success: false, message: check.message };
      }
    }
    const validDiscount = Math.min(100, Math.max(0, discount));
    set({ manualDiscount: validDiscount });
    useCartStore
      .getState()
      .setDiscounts(useCartStore.getState().customerDiscountPercentage, validDiscount);
    return { success: true, message: `Descuento del ${validDiscount}% aplicado correctamente.` };
  },

  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

  resetPosCycle: () => {
    set({
      selectedCustomer: DEFAULT_CUSTOMER,
      manualDiscount: 0,
    });
    useCartStore.getState().setDiscounts(DEFAULT_CUSTOMER.discountPercentage, 0);
  },
}));

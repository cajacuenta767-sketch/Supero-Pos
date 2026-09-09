import { create } from 'zustand';

export interface Customer {
  id: string;
  businessName: string;
  taxId: string;
  group: 'GENERAL' | 'MAYORISTA' | 'VIP';
  discountPercentage: number; // e.g. VIP 5%
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
  supervisorPin: string;
  pendingSyncCount: number;

  // Actions
  openCashShift: (initialFloat: number, registerId?: string, registerName?: string) => void;
  closeCashShift: (countedCash: number, notes?: string) => void;
  setCustomer: (customer: Customer) => void;
  setManualDiscount: (discount: number, pinInput?: string) => { success: boolean; message: string };
  setPendingSyncCount: (count: number) => void;
  resetPosCycle: () => void;
}

export const usePosStore = create<PosState>((set, get) => ({
  cashShift: {
    id: 'shift-001',
    registerId: 'caja-1',
    registerName: 'Caja 1 Principal',
    userId: 'usr-1',
    userName: 'Juan Pérez',
    initialFloat: 200.00,
    openedAt: new Date().toISOString(),
    status: 'OPEN',
  },
  selectedCustomer: DEFAULT_CUSTOMER,
  manualDiscount: 0,
  supervisorPin: '1234', // Default supervisor authorization PIN
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
    set({ cashShift: newShift });
  },

  closeCashShift: () => {
    set({ cashShift: null });
  },

  setCustomer: (customer) => set({ selectedCustomer: customer }),

  setManualDiscount: (discount, pinInput) => {
    // Limits: Manual discounts > 10% require supervisor PIN validation
    if (discount > 10) {
      if (pinInput !== get().supervisorPin) {
        return { success: false, message: 'PIN de Supervisor incorrecto. Descuento > 10% requiere autorización.' };
      }
    }
    const validDiscount = Math.min(100, Math.max(0, discount));
    set({ manualDiscount: validDiscount });
    return { success: true, message: `Descuento del ${validDiscount}% aplicado correctamente.` };
  },

  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

  resetPosCycle: () => {
    set({
      selectedCustomer: DEFAULT_CUSTOMER,
      manualDiscount: 0,
    });
  },
}));

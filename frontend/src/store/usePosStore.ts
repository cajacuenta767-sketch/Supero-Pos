import { create } from 'zustand';
import { authorizeSupervisor } from '../utils/supervisorPin';
import { useCartStore } from './useCartStore';
import { readPersisted, writePersisted } from './persist';
import { localId } from '../utils/ids';
import { useAuthStore } from './useAuthStore';
import { useSettingsStore } from './useSettingsStore';

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
  /** `true` si el turno existe también en el servidor. */
  syncedWithServer?: boolean;
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
  openCashShift: (
    initialFloat: number,
    registerId?: string,
    registerName?: string,
  ) => Promise<void>;
  closeCashShift: (countedCash: number, notes?: string) => void;
  setCustomer: (customer: Customer) => void;
  setManualDiscount: (
    discount: number,
    pinInput?: string,
  ) => Promise<{ success: boolean; message: string }>;
  setPendingSyncCount: (count: number) => void;
  resetPosCycle: () => void;
}

/**
 * Turno guardado, si lo hay.
 *
 * Una terminal nueva arranca **sin turno**, y el modal de arqueo —que es
 * bloqueante mientras no haya uno— obliga a abrirlo. Antes se sembraba uno
 * aquí: un turno que el servidor nunca había visto, con una caja inventada
 * («caja-1») y un usuario de relleno. Cada venta hecha bajo él se rechazaba al
 * sincronizar por «referencias inexistentes» y se quedaba en la cola local para
 * siempre, mientras la tienda seguía cobrando y la central no veía un ticket.
 *
 * `null` guardado es un turno cerrado a propósito, y se distingue de no haber
 * nada guardado: un cierre no se deshace al recargar.
 */
const initialShift = (): CashShift | null => readPersisted<CashShift | null>(SHIFT_KEY);

export const usePosStore = create<PosState>((set, get) => ({
  /* El turno es la unidad contable de la jornada. Antes vivía en estado plano:
     se cerraba la caja, se recargaba la terminal y volvía a aparecer abierto con
     los valores de demostración —y el arqueo, que calcula el efectivo esperado
     desde `openedAt`, partía de un momento equivocado. */
  cashShift: initialShift(),
  selectedCustomer: DEFAULT_CUSTOMER,
  manualDiscount: 0,
  pendingSyncCount: 0,

  openCashShift: async (initialFloat, registerId, registerName) => {
    /* El turno es de quien lo abre. Estaba fijo en «Juan Pérez», así que el
       cierre de caja nombraba a un empleado que podía no haber trabajado. */
    const operator = useAuthStore.getState().user;
    const float = parseFloat(initialFloat.toFixed(2));

    /* Con red, el turno lo abre el servidor y la terminal se queda con sus
       identificadores. Antes se inventaba un `caja-1` y un turno local; el
       servidor no los reconocía y rechazaba cada venta al sincronizar con
       «referencias inexistentes», así que los tickets se acumulaban en la cola
       local y la central no veía uno solo. */
    let remote: { shiftId: string; registerId: string; registerName: string } | null = null;
    try {
      const { apiClient } = await import('../services/api.client');

      let caja = registerId;
      let nombre = registerName;
      if (!caja) {
        const { data } = await apiClient.get('/cash-registers');
        const primera = data?.data?.[0];
        if (primera) {
          caja = primera.id;
          nombre = primera.name;
        }
      }

      if (caja) {
        let shiftId: string | undefined;

        try {
          const { data } = await apiClient.post('/cash-registers/open', {
            registerId: caja,
            initialFloat: float,
          });
          shiftId = data?.data?.id ?? data?.id;
        } catch (error) {
          /* Ya había un turno abierto en esa caja —la terminal se reinició, o
             se recargó la página— y el servidor hace bien en no abrir otro. Se
             adopta el que hay: antes la caja se conformaba con uno local, y
             cada venta hecha bajo él se rechazaba al sincronizar por «turno
             inexistente». */
          const yaAbierto = (error as { response?: { status?: number } }).response?.status === 400;
          if (!yaAbierto) throw error;

          const { data } = await apiClient.get('/cash-registers/active-shift', {
            params: { registerId: caja },
          });
          shiftId = data?.data?.id;
        }

        if (shiftId) {
          remote = { shiftId, registerId: caja, registerName: nombre ?? 'Caja' };
        }
      }
    } catch {
      /* Sin red se abre en local: una tienda desconectada tiene que poder
         vender. Las ventas esperan en la cola hasta que haya conexión. */
    }

    const newShift: CashShift = {
      id: remote?.shiftId ?? localId('shift'),
      registerId: remote?.registerId ?? registerId ?? 'caja-1',
      registerName: remote?.registerName ?? registerName ?? 'Caja 1 Principal',
      userId: String(operator?.id ?? 'sin-identificar'),
      userName: operator?.name ?? operator?.username ?? 'Sin identificar',
      initialFloat: float,
      openedAt: new Date().toISOString(),
      status: 'OPEN',
      /* Un turno abierto solo en la terminal no puede respaldar una venta que
         el servidor acepte: se marca para poder decirlo. */
      syncedWithServer: remote !== null,
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

  setManualDiscount: async (discount, pinInput) => {
    /* Los descuentos por encima del 10 % exigen autorización. El PIN ya no vive
       en el store —era la cadena '1234' en el bundle— ni se compara aquí: lo
       decide el servidor contra su hash, con la comprobación local solo cuando
       no hay red.

       La exigencia del PIN se configura en Ajustes · Seguridad. El interruptor
       existía y no lo leía nadie: el PIN se pedía siempre, estuviera apagado o
       encendido. */
    if (discount > 10 && useSettingsStore.getState().requirePinForDiscounts) {
      const check = await authorizeSupervisor(
        pinInput ?? '',
        'discount',
        get().cashShift?.registerName ?? 'sin-turno',
      );
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

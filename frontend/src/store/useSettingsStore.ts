import { create } from 'zustand';
import { readPersisted, writePersisted } from './persist';

/**
 * Ajustes de la empresa que el resto de la aplicación necesita conocer.
 *
 * La moneda se elegía en Ajustes y no la consumía nadie: la pantalla mostraba
 * «$» —el valor por defecto de `Money`—, las cuentas guardaban `currency: 'USD'`
 * fijo, el formateador que producía «Bs.» era código muerto, y el ticket impreso
 * decía otra cosa. Cuatro monedas conviviendo en el mismo producto.
 */

export type CurrencyCode = 'BOB' | 'USD';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
  /** Etiqueta local para dar formato a los números. */
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  BOB: { code: 'BOB', symbol: 'Bs.', label: 'Bolivianos', locale: 'es-BO' },
  USD: { code: 'USD', symbol: '$', label: 'Dólares', locale: 'en-US' },
};

const STORAGE_KEY = 'ajustes';

interface CompanySettings {
  companyName: string;
  companyNit: string;
  companyAddress: string;
  phone: string;
  email: string;
  currency: CurrencyCode;
  /** Ancho del papel de la impresora térmica. */
  paperWidth: '80mm' | '58mm';
  logo: string | null;

  /* Plantilla del ticket impreso. Vivía dentro de la pantalla de
     Notificaciones, en un estado que no se guardaba en ningún sitio: se
     configuraba el pie de página, se pulsaba «Guardar», el aviso decía
     «Plantilla guardada» y al recargar volvía todo al valor de fábrica. Y como
     lo que se imprime sale de aquí, nada de lo configurado allí llegaba nunca
     al papel. */
  ticketFooter: string;
  ticketDisclaimer: string;
  ticketShowLogo: boolean;
  ticketShowCustomer: boolean;
  ticketShowSerials: boolean;
  ticketShowQr: boolean;

  /* Hardware, seguridad y sincronización. Doce campos que se editaban, se
     guardaban con un «Ajustes guardados» y volvían al valor de fábrica en la
     siguiente recarga porque no se escribían en ninguna parte. */
  printerInterface: string;
  autoCutPaper: boolean;
  cashDrawerPulse: boolean;
  scannerLatencyMs: number;
  scaleProtocol: string;
  /** Minutos de inactividad antes de cerrar la sesión. 0 lo desactiva. */
  inactivityTimeoutMins: number;
  requirePinForVoids: boolean;
  requirePinForDiscounts: boolean;
  criticalStockThreshold: number;
  /** Segundos entre intentos de subir la cola pendiente. */
  syncIntervalSec: number;
}

const DEFAULTS: CompanySettings = {
  companyName: 'Supero POS Enterprise',
  companyNit: '10293847019',
  companyAddress: 'Av. Las Palmas #450, Santa Cruz - Bolivia',
  phone: '+591 70012345',
  email: 'contacto@superopos.com',
  currency: 'BOB',
  paperWidth: '80mm',
  logo: null,
  ticketFooter: '¡Gracias por su compra! Vuelva pronto.',
  ticketDisclaimer: 'ESTE DOCUMENTO ES UNA REPRESENTACIÓN DE COMPROBANTE DE VENTA INTERNO.',
  ticketShowLogo: true,
  ticketShowCustomer: true,
  ticketShowSerials: true,
  ticketShowQr: true,
  printerInterface: 'USB',
  autoCutPaper: true,
  cashDrawerPulse: true,
  scannerLatencyMs: 10,
  scaleProtocol: 'CAS_PD_II',
  inactivityTimeoutMins: 15,
  requirePinForVoids: true,
  requirePinForDiscounts: true,
  criticalStockThreshold: 5,
  syncIntervalSec: 30,
};

interface SettingsState extends CompanySettings {
  update: (patch: Partial<CompanySettings>) => void;
  currencyInfo: () => CurrencyInfo;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  ...(readPersisted<Partial<CompanySettings>>(STORAGE_KEY) ?? {}),

  update: (patch) =>
    set((state) => {
      const next = { ...state, ...patch };
      /* Se guarda campo a campo y no el estado entero: en el estado también
         viven las funciones del store, que no son datos. */
      writePersisted<CompanySettings>(STORAGE_KEY, {
        companyName: next.companyName,
        companyNit: next.companyNit,
        companyAddress: next.companyAddress,
        phone: next.phone,
        email: next.email,
        currency: next.currency,
        paperWidth: next.paperWidth,
        logo: next.logo,
        ticketFooter: next.ticketFooter,
        ticketDisclaimer: next.ticketDisclaimer,
        ticketShowLogo: next.ticketShowLogo,
        ticketShowCustomer: next.ticketShowCustomer,
        ticketShowSerials: next.ticketShowSerials,
        ticketShowQr: next.ticketShowQr,
        printerInterface: next.printerInterface,
        autoCutPaper: next.autoCutPaper,
        cashDrawerPulse: next.cashDrawerPulse,
        scannerLatencyMs: next.scannerLatencyMs,
        scaleProtocol: next.scaleProtocol,
        inactivityTimeoutMins: next.inactivityTimeoutMins,
        requirePinForVoids: next.requirePinForVoids,
        requirePinForDiscounts: next.requirePinForDiscounts,
        criticalStockThreshold: next.criticalStockThreshold,
        syncIntervalSec: next.syncIntervalSec,
      });
      return next;
    }),

  currencyInfo: () => CURRENCIES[get().currency] ?? CURRENCIES.BOB,
}));

/** Símbolo vigente, para quien solo necesita pintarlo. */
export const currencySymbol = (): string => useSettingsStore.getState().currencyInfo().symbol;

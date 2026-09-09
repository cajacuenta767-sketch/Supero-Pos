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
      const { companyName, companyNit, companyAddress, phone, email, currency, paperWidth, logo } =
        next;
      writePersisted<CompanySettings>(STORAGE_KEY, {
        companyName,
        companyNit,
        companyAddress,
        phone,
        email,
        currency,
        paperWidth,
        logo,
      });
      return next;
    }),

  currencyInfo: () => CURRENCIES[get().currency] ?? CURRENCIES.BOB,
}));

/** Símbolo vigente, para quien solo necesita pintarlo. */
export const currencySymbol = (): string => useSettingsStore.getState().currencyInfo().symbol;

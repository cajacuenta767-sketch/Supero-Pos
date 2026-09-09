import React from 'react';
import { cn } from './cn';
import { CURRENCIES, useSettingsStore } from '../store/useSettingsStore';

type Size = 'body' | 'base' | 'title' | 'display' | 'hero';

const SIZE: Record<Size, string> = {
  body: 'text-body',
  base: 'text-base font-semibold',
  title: 'text-title',
  display: 'text-display',
  hero: 'text-hero',
};

export interface MoneyProps {
  value: number;
  size?: Size;
  /** Fuerza un símbolo distinto al de la empresa. Rara vez hace falta. */
  currency?: string;
  signed?: boolean;
  className?: string;
}

/**
 * La cifra manda. Anchura de dígito fija: el número no baila al actualizarse.
 *
 * El símbolo y el formato salen de los ajustes de la empresa. Antes el valor por
 * defecto era «$» y toda la aplicación mostraba dólares mientras Ajustes decía
 * bolivianos y el ticket impreso decía «Bs.».
 */
export const Money: React.FC<MoneyProps> = ({
  value,
  size = 'base',
  currency,
  signed = false,
  className,
}) => {
  const info = useSettingsStore((state) => CURRENCIES[state.currency] ?? CURRENCIES.BOB);
  const symbol = currency ?? info.symbol;
  const sign = signed && value > 0 ? '+' : value < 0 ? '−' : '';
  const abs = Math.abs(value).toLocaleString(info.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (
    <span className={cn('font-mono tnum tracking-tight', SIZE[size], className)}>
      {sign}
      {symbol}
      {abs}
    </span>
  );
};

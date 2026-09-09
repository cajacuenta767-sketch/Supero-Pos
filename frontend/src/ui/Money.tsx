import React from 'react';
import { cn } from './cn';

type Size = 'body' | 'base' | 'title' | 'display' | 'hero';

const SIZE: Record<Size, string> = {
  body:    'text-body',
  base:    'text-base font-semibold',
  title:   'text-title',
  display: 'text-display',
  hero:    'text-hero',
};

export interface MoneyProps {
  value: number;
  size?: Size;
  currency?: string;
  signed?: boolean;
  className?: string;
}

/**
 * La cifra manda. Anchura de dígito fija: el número no baila al actualizarse.
 */
export const Money: React.FC<MoneyProps> = ({
  value, size = 'base', currency = '$', signed = false, className,
}) => {
  const sign = signed && value > 0 ? '+' : value < 0 ? '−' : '';
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (
    <span className={cn('font-mono tnum tracking-tight', SIZE[size], className)}>
      {sign}{currency}{abs}
    </span>
  );
};

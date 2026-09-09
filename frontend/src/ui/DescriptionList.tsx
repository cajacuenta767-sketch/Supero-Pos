import React from 'react';
import { cn } from './cn';

export interface DescriptionItem {
  label: string;
  value: React.ReactNode;
  /** Ocupa las dos columnas: para direcciones, notas y textos largos. */
  wide?: boolean;
}

export interface DescriptionListProps {
  items: DescriptionItem[];
  /** Una columna en paneles estrechos; dos cuando hay sitio. */
  columns?: 1 | 2;
  className?: string;
}

/** Pares rótulo/valor para paneles de detalle. */
export const DescriptionList: React.FC<DescriptionListProps> = ({
  items,
  columns = 2,
  className,
}) => (
  <dl
    className={cn(
      'grid gap-x-6 gap-y-4',
      columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
      className,
    )}
  >
    {items.map((it) => (
      <div key={it.label} className={cn('min-w-0', it.wide && 'sm:col-span-2')}>
        <dt className="text-micro uppercase text-ink-3">{it.label}</dt>
        <dd className="text-base text-ink mt-0.5 break-words">{it.value}</dd>
      </div>
    ))}
  </dl>
);

import React from 'react';
import { cn } from './cn';

export interface PaginationProps {
  /** Registros mostrados tras aplicar filtros. */
  shown: number;
  /** Registros totales antes de filtrar. */
  total: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  /** Nombre en plural de lo que se lista: "productos", "usuarios". */
  noun?: string;
  sizes?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  shown,
  total,
  pageSize,
  onPageSizeChange,
  noun = 'registros',
  sizes = [10, 25, 50, 100],
  className,
}) => (
  <div
    className={cn(
      'flex flex-wrap items-center justify-between gap-3 text-body text-ink-2',
      className,
    )}
  >
    <span>
      Mostrando <span className="font-mono tnum text-ink">{shown}</span> de{' '}
      <span className="font-mono tnum text-ink">{total}</span> {noun}
    </span>

    <label className="flex items-center gap-2">
      Por página
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="h-8 px-2 bg-raised border border-line-strong rounded-md text-body font-semibold text-ink cursor-pointer hover:border-ink-3 transition-colors duration-fast ease-ease"
      >
        {sizes.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  </div>
);

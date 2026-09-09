import React from 'react';
import { Search } from 'lucide-react';
import { cn } from './cn';

export interface ToolbarProps {
  /** Valor y manejador del buscador. Omitir ambos deja la fila sin buscador. */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Selectores de filtro, en el orden en que se leen. */
  filters?: React.ReactNode;
  /** Acción primaria, al extremo opuesto de los filtros. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Una fila de filtros sobre la tabla, con la acción primaria al extremo
 * opuesto. Persistente: los filtros no se esconden tras un desplegable en
 * escritorio, porque se usan en cada visita.
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar…',
  filters,
  action,
  className,
}) => (
  <div className={cn('flex flex-wrap items-center gap-2', className)}>
    {onSearchChange && (
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
        <input
          type="text"
          value={search ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full h-9 pl-9 pr-3 bg-raised border border-line-strong rounded-md text-base text-ink hover:border-ink-3 focus:border-accent transition-colors duration-fast ease-ease"
        />
      </div>
    )}

    {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}

    {action && (
      <>
        <div className="flex-1" />
        <div className="shrink-0">{action}</div>
      </>
    )}
  </div>
);

/** Selector con el estilo de la barra. Evita repetir la clase en cada vista. */
export const ToolbarSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  ...rest
}) => (
  <select
    {...rest}
    className={cn(
      'h-9 px-2.5 bg-raised border border-line-strong rounded-md text-body font-semibold text-ink',
      'cursor-pointer hover:border-ink-3 transition-colors duration-fast ease-ease',
      className,
    )}
  />
);

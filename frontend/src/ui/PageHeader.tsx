import React from 'react';
import { cn } from './cn';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Acción primaria de la vista, al extremo opuesto del título. */
  actions?: React.ReactNode;
  /** Barra de pestañas. Va bajo el título, nunca dentro de un cuadro. */
  tabs?: React.ReactNode;
  className?: string;
}

/**
 * Encabezado de vista. Sobre el lienzo, no dentro de una tarjeta: el título no
 * es contenido de un cuadro, es la identidad de la pantalla.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  tabs,
  className,
}) => (
  <header className={cn('space-y-4', className)}>
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-display text-ink">{title}</h1>
        {subtitle && <p className="text-base text-ink-2 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
    {tabs}
  </header>
);

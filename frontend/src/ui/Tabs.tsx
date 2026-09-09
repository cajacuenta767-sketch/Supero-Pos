import React from 'react';
import { cn } from './cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Contador opcional a la derecha del rótulo. */
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Rótulo accesible del grupo, p. ej. "Secciones de ajustes". */
  label: string;
  className?: string;
}

/**
 * Navegación en segmentos. Las pestañas son navegación, no contenido: viven
 * fuera del cuadro que gobiernan. Bajo 768px colapsan a un desplegable, que es
 * lo único que cabe sin cortar rótulos.
 */
export const Tabs: React.FC<TabsProps> = ({ items, value, onChange, label, className }) => (
  <>
    <nav
      aria-label={label}
      className={cn(
        'hidden sm:flex rounded-md border border-line overflow-hidden shrink-0',
        className,
      )}
    >
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'h-9 px-4 inline-flex items-center gap-2 text-body font-semibold whitespace-nowrap',
              'transition-colors duration-fast ease-ease',
              'border-r border-line last:border-r-0',
              active ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-ink-2 hover:text-ink',
            )}
          >
            {t.icon}
            {t.label}
            {typeof t.count === 'number' && (
              <span className="font-mono tnum text-micro text-ink-3">{t.count}</span>
            )}
          </button>
        );
      })}
    </nav>

    {/* Bajo 768px un desplegable: seis rótulos en fila no caben sin partirse. */}
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="sm:hidden h-9 px-2.5 w-full bg-raised border border-line-strong rounded-md text-body font-semibold text-ink cursor-pointer"
    >
      {items.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  </>
);

import React from 'react';
import { cn } from './cn';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Ancho CSS explícito, p. ej. '120px' o '1fr'. */
  width?: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T, index: number) => React.ReactNode;
  /** Papel de la columna al plegarse en tarjeta bajo 768px.
   *  `title` encabeza la tarjeta, `meta` va a su derecha, `hidden` se omite.
   *  Sin declarar, la columna aparece como par rótulo/valor. */
  card?: 'title' | 'meta' | 'hidden';
}

export interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  /** Modo denso: 36px por fila. Solo fuera del POS. */
  dense?: boolean;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  dense = false,
  empty,
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <div className={cn('border border-line rounded-lg bg-raised', className)}>{empty}</div>;
  }

  const titleCol = columns.find((c) => c.card === 'title') ?? columns[0];
  const metaCols = columns.filter((c) => c.card === 'meta');
  const bodyCols = columns.filter(
    (c) => c !== titleCol && c.card !== 'meta' && c.card !== 'hidden',
  );

  return (
    <>
      {/* Bajo 768px cada fila se pliega en tarjeta. Ocultar columnas pierde
          información; plegarla la conserva y la hace legible con el pulgar. */}
      <div className={cn('md:hidden space-y-2', className)}>
        {rows.map((row, i) => (
          <div
            key={rowKey(row, i)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              'p-3 rounded-lg border border-line bg-raised shadow-e1 space-y-2',
              onRowClick && 'cursor-pointer active:bg-sunken',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{titleCol?.render(row, i)}</div>
              {metaCols.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  {metaCols.map((c) => (
                    <div key={c.key}>{c.render(row, i)}</div>
                  ))}
                </div>
              )}
            </div>

            {bodyCols.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-line">
                {bodyCols.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-micro uppercase text-ink-3">{c.header}</dt>
                    <dd className="text-body text-ink mt-0.5">{c.render(row, i)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>

      <div
        className={cn(
          'hidden md:block border border-line rounded-lg bg-raised overflow-auto',
          className,
        )}
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-sunken">
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={cn(
                    'px-3 h-10 text-micro uppercase text-ink-2 font-semibold',
                    'border-b border-line whitespace-nowrap',
                    ALIGN[c.align ?? 'left'],
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-line last:border-0 transition-colors duration-fast ease-ease',
                  onRowClick && 'cursor-pointer hover:bg-sunken',
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-3 text-ink',
                      dense ? 'h-9 text-body' : 'h-12 text-base',
                      ALIGN[c.align ?? 'left'],
                    )}
                  >
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

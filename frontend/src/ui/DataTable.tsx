import React from 'react';
import { cn } from './cn';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Ancho CSS explícito, p. ej. '120px' o '1fr'. */
  width?: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T, index: number) => React.ReactNode;
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

  return (
    <div className={cn('border border-line rounded-lg bg-raised overflow-auto', className)}>
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
  );
}

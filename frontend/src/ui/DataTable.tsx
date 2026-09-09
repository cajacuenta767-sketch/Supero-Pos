import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
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
  /**
   * Valor por el que ordena esta columna.
   *
   * Declararlo hace la cabecera pulsable. Se pide aparte de `render` porque lo
   * que se pinta suele ser una insignia o un icono, y ordenar por su marcado no
   * significa nada: aquí va el dato en crudo.
   */
  sortValue?: (row: T) => string | number | null | undefined;
}

export interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  /** Modo denso: 36px por fila. Solo fuera del POS. */
  dense?: boolean;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Descripción de la tabla para lectores de pantalla. Obligatoria: una
   *  rejilla sin nombre no se puede navegar a ciegas. */
  caption: string;
  /** Filas por página. Omitido, no pagina. */
  pageSize?: number;
  className?: string;
}

type SortDirection = 'asc' | 'desc';

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  dense = false,
  empty,
  onRowClick,
  caption,
  pageSize,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: SortDirection } | null>(null);
  const [page, setPage] = useState(0);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    /* Copia antes de ordenar: `sort` muta, y mutar el arreglo del padre provoca
       que React no vea el cambio o lo vea a destiempo. */
    return [...rows].sort((a, b) => {
      const va = column.sortValue!(a);
      const vb = column.sortValue!(b);
      // Los vacíos van siempre al final, ordene como ordene.
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), 'es', { numeric: true }) * factor;
    });
  }, [rows, columns, sort]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(sortedRows.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = pageSize
    ? sortedRows.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : sortedRows;

  const toggleSort = (key: string) =>
    setSort((current) => {
      if (current?.key !== key) return { key, dir: 'asc' };
      // Tercer clic: se vuelve al orden natural, que suele ser el cronológico.
      return current.dir === 'asc' ? { key, dir: 'desc' } : null;
    });

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
        {visibleRows.map((row, i) => (
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
          {/* Un lector de pantalla anunciaba «tabla» sin decir de qué. */}
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10">
            <tr className="bg-sunken">
              {columns.map((c) => {
                const sortable = Boolean(c.sortValue);
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    style={c.width ? { width: c.width } : undefined}
                    className={cn(
                      'px-3 h-10 text-micro uppercase text-ink-2 font-semibold',
                      'border-b border-line whitespace-nowrap',
                      ALIGN[c.align ?? 'left'],
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 group',
                          'transition-colors duration-fast ease-ease hover:text-ink',
                          active && 'text-ink',
                          c.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === 'asc' ? (
                            <ArrowUp className="w-3 h-3" aria-hidden />
                          ) : (
                            <ArrowDown className="w-3 h-3" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown
                            className="w-3 h-3 opacity-0 group-hover:opacity-40"
                            aria-hidden
                          />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => (
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

      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 mt-3">
          <p className="text-body text-ink-3">
            <span className="font-mono tnum">{safePage * pageSize + 1}</span>–
            <span className="font-mono tnum">
              {Math.min((safePage + 1) * pageSize, sortedRows.length)}
            </span>{' '}
            de <span className="font-mono tnum">{sortedRows.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(safePage - 1)}
              disabled={safePage === 0}
              className={cn(
                'h-8 px-3 rounded-md border border-line bg-raised text-body text-ink-2',
                'hover:border-line-strong hover:text-ink transition-colors duration-fast ease-ease',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              Anterior
            </button>
            <span className="text-body text-ink-3 font-mono tnum">
              {safePage + 1}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(safePage + 1)}
              disabled={safePage >= totalPages - 1}
              className={cn(
                'h-8 px-3 rounded-md border border-line bg-raised text-body text-ink-2',
                'hover:border-line-strong hover:text-ink transition-colors duration-fast ease-ease',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}

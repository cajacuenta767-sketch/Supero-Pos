/**
 * Exportación a CSV desde la terminal.
 *
 * El botón «Exportar» de Informes no tenía `onClick`: se pulsaba y no ocurría
 * nada. Se genera aquí en el cliente porque el informe que interesa exportar es
 * el que se está viendo, ya filtrado, y pedírselo al servidor obligaría a
 * repetir los filtros al otro lado.
 */

/** Escapa un valor para CSV: comillas, saltos de línea y separadores. */
const escape = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

export const buildCsv = <T>(columns: Array<CsvColumn<T>>, rows: T[]): string => {
  /* Punto y coma como separador: Excel en configuración regional española usa
     la coma como decimal, y con coma de separador parte cada importe en dos
     columnas. */
  const lines = [columns.map((c) => escape(c.header)).join(';')];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(c.value(row))).join(';'));
  }
  return lines.join('\r\n');
};

/**
 * Descarga el CSV.
 *
 * Lleva BOM UTF-8 al principio: sin él, Excel abre el archivo en la codificación
 * del sistema y los acentos salen rotos, que es la queja número uno de cualquier
 * exportación en español.
 */
export const downloadCsv = (filename: string, content: string): void => {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

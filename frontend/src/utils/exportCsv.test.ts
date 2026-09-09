import { describe, expect, it } from 'vitest';
import { buildCsv } from './exportCsv';

interface Ticket {
  id: string;
  cliente: string;
  total: number;
  nota?: string;
}

const columns = [
  { header: 'Ticket', value: (t: Ticket) => t.id },
  { header: 'Cliente', value: (t: Ticket) => t.cliente },
  { header: 'Total', value: (t: Ticket) => t.total },
  { header: 'Nota', value: (t: Ticket) => t.nota },
];

describe('generación de CSV', () => {
  it('escribe la cabecera y una fila por registro', () => {
    const csv = buildCsv(columns, [{ id: 'TK-1', cliente: 'Ana', total: 20.5 }]);
    expect(csv.split('\r\n')).toEqual(['Ticket;Cliente;Total;Nota', 'TK-1;Ana;20.5;']);
  });

  it('usa punto y coma: con coma, Excel en español parte cada importe en dos', () => {
    const csv = buildCsv(columns, []);
    expect(csv).toBe('Ticket;Cliente;Total;Nota');
  });

  it('entrecomilla lo que contiene el separador', () => {
    const csv = buildCsv(columns, [
      { id: 'TK-2', cliente: 'Pérez; Hermanos S.R.L.', total: 10, nota: 'sin nota' },
    ]);
    expect(csv).toContain('"Pérez; Hermanos S.R.L."');
  });

  it('duplica las comillas dentro del texto', () => {
    const csv = buildCsv(columns, [{ id: 'TK-3', cliente: 'El "Rápido"', total: 1 }]);
    expect(csv).toContain('"El ""Rápido"""');
  });

  it('entrecomilla los saltos de línea para no partir la fila', () => {
    const csv = buildCsv(columns, [
      { id: 'TK-4', cliente: 'Ana', total: 1, nota: 'línea 1\nlínea 2' },
    ]);
    expect(csv.split('\r\n')).toHaveLength(2);
  });

  it('deja vacíos los valores ausentes en vez de escribir «undefined»', () => {
    const csv = buildCsv(columns, [{ id: 'TK-5', cliente: 'Ana', total: 0 }]);
    expect(csv).not.toContain('undefined');
    expect(csv.endsWith(';')).toBe(true);
  });
});

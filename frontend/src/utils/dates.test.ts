import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatTime, trimSeconds } from './dates';

const MOMENT = new Date('2026-08-14T14:22:07');

describe('formato', () => {
  it('la fecha va en día/mes/año', () => {
    expect(formatDate(MOMENT)).toBe('14/08/2026');
  });

  it('la hora va en 24 horas y sin segundos', () => {
    expect(formatTime(MOMENT)).toBe('14:22');
  });

  it('la fecha y hora combinan ambos', () => {
    expect(formatDateTime(MOMENT)).toBe('14/08/2026 14:22');
  });

  it('acepta una fecha en texto', () => {
    expect(formatDate('2026-08-14T14:22:07')).toBe('14/08/2026');
  });
});

describe('valores que no son fechas', () => {
  it('devuelve el texto tal cual en vez de «Invalid Date»', () => {
    expect(formatDate('sin fecha')).toBe('sin fecha');
    expect(formatTime('—')).toBe('—');
    expect(formatDateTime('pendiente')).toBe('pendiente');
  });
});

describe('normalización de horas escritas a mano', () => {
  it('quita los segundos', () => {
    expect(trimSeconds('14/08/2026 14:15:22')).toBe('14/08/2026 14:15');
    expect(trimSeconds('08:30:15')).toBe('08:30');
  });

  it('deja intacta una hora que ya venía sin segundos', () => {
    expect(trimSeconds('14/08/2026 14:22')).toBe('14/08/2026 14:22');
  });

  it('no toca una fecha', () => {
    expect(trimSeconds('14/08/2026')).toBe('14/08/2026');
  });
});

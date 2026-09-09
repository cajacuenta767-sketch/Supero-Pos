import { describe, expect, it } from 'vitest';
import { fromCents, lineTotalCents, percentOf, sumCents, toCents } from './money';

describe('conversión a céntimos', () => {
  it('convierte importes decimales sin arrastrar error binario', () => {
    expect(toCents(0.1)).toBe(10);
    expect(toCents(0.2)).toBe(20);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(850)).toBe(85000);
  });

  it('sumar 0,1 y 0,2 da exactamente 0,30', () => {
    // En coma flotante, 0.1 + 0.2 === 0.30000000000000004.
    expect(fromCents(sumCents([toCents(0.1), toCents(0.2)]))).toBe(0.3);
  });

  it('redondea al par en el punto medio para no sesgar hacia arriba', () => {
    expect(toCents(0.125)).toBe(12);
    expect(toCents(0.135)).toBe(14);
  });

  it('trata los valores no finitos como cero en vez de propagar NaN', () => {
    expect(toCents(Number.NaN)).toBe(0);
    expect(toCents(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('porcentajes', () => {
  it('aplica un descuento entero', () => {
    expect(percentOf(10000, 10)).toBe(1000);
  });

  it('admite porcentajes decimales', () => {
    expect(percentOf(10000, 5.5)).toBe(550);
  });

  it('un 0 % no descuenta nada', () => {
    expect(percentOf(87025, 0)).toBe(0);
  });
});

describe('total de línea', () => {
  it('multiplica cantidades decimales de granel', () => {
    // 0,450 kg a 45,00 = 20,25
    expect(fromCents(lineTotalCents(0.45, toCents(45)))).toBe(20.25);
  });

  it('mantiene la exactitud en cantidades enteras grandes', () => {
    expect(fromCents(lineTotalCents(100, toCents(8.5)))).toBe(850);
  });
});

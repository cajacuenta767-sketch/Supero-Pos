import { describe, expect, it } from 'vitest';
import { ean13CheckDigit, isValidEan13 } from '../ui/Barcode';
import { imeiCheckDigit, imeiError, isValidImei } from './imei';

describe('EAN-13', () => {
  it('calcula el dígito de control de códigos publicados', () => {
    // ISBN-13 de un libro conocido y dos EAN de producto.
    expect(ean13CheckDigit('978020137962')).toBe(4);
    expect(ean13CheckDigit('400638133393')).toBe(1);
    expect(ean13CheckDigit('590123412345')).toBe(7);
  });

  it('acepta un código completo válido', () => {
    expect(isValidEan13('9780201379624')).toBe(true);
    expect(isValidEan13('4006381333931')).toBe(true);
  });

  it('rechaza un dígito de control equivocado', () => {
    expect(isValidEan13('9780201379625')).toBe(false);
  });

  it('rechaza longitudes distintas de 13 y contenido no numérico', () => {
    expect(isValidEan13('978020137962')).toBe(false);
    expect(isValidEan13('97802013796244')).toBe(false);
    expect(isValidEan13('97802013796X4')).toBe(false);
    expect(isValidEan13('')).toBe(false);
  });

  it('el generador del formulario produce códigos válidos', () => {
    // '777' es el prefijo GS1 de Bolivia; se comprueba el ciclo completo.
    for (let i = 0; i < 200; i++) {
      const base = '777' + String(100000000 + i * 4093).slice(0, 9);
      const full = base + ean13CheckDigit(base);
      expect(isValidImei(full)).toBe(false); // no es un IMEI, es un EAN
      expect(isValidEan13(full)).toBe(true);
    }
  });
});

describe('IMEI', () => {
  it('calcula el dígito de control por Luhn', () => {
    expect(imeiCheckDigit('49015420323751')).toBe(8);
    expect(imeiCheckDigit('35693803564380')).toBe(9);
  });

  it('acepta IMEI válidos', () => {
    expect(isValidImei('490154203237518')).toBe(true);
    expect(isValidImei('356938035643809')).toBe(true);
  });

  it('rechaza un dígito cambiado', () => {
    expect(isValidImei('490154203237519')).toBe(false);
  });

  it('no marca error mientras el campo está vacío', () => {
    expect(imeiError('')).toBeUndefined();
    expect(imeiError('   ')).toBeUndefined();
  });

  it('explica qué falta en vez de decir solo «inválido»', () => {
    expect(imeiError('49015420323')).toMatch(/15 dígitos/);
    expect(imeiError('4901542032375AB')).toMatch(/solo dígitos/i);
    expect(imeiError('490154203237519')).toMatch(/control/);
  });
});

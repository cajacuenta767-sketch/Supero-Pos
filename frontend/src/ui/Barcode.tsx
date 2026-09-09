import React from 'react';
import { cn } from './cn';

/* Codificación EAN-13 real. La vista previa de una etiqueta solo sirve si lo
   que se imprime se puede escanear: unas barras decorativas no lo son. */
const L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const G = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
const R = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];

/** Qué mitad del primer grupo usa codificación G, según el primer dígito. */
const PARITY = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

/** Dígito de control: posiciones impares ×1, pares ×3. */
export const ean13CheckDigit = (first12: string): number => {
  const sum = first12
    .slice(0, 12)
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
};

export const isValidEan13 = (code: string): boolean =>
  /^\d{13}$/.test(code) && ean13CheckDigit(code) === Number(code[12]);

/** Devuelve los 95 módulos del código, o null si el valor no es codificable. */
const encodeEan13 = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 12 && digits.length !== 13) return null;

  const first12 = digits.slice(0, 12);
  const code = first12 + String(digits.length === 13 ? digits[12] : ean13CheckDigit(first12));

  const parity = PARITY[Number(code[0])];
  let bits = '101';
  for (let i = 1; i <= 6; i++) {
    const d = Number(code[i]);
    bits += parity[i - 1] === 'L' ? L[d] : G[d];
  }
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[Number(code[i])];
  return bits + '101';
};

export interface BarcodeProps {
  value: string;
  /** Alto de las barras en px. El ancho lo fija el número de módulos. */
  height?: number;
  /** Ancho de un módulo. 2px es lo mínimo fiable en térmica de 203 ppp. */
  moduleWidth?: number;
  showValue?: boolean;
  className?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  height = 40,
  moduleWidth = 2,
  showValue = true,
  className,
}) => {
  const bits = encodeEan13(value);

  if (!bits) {
    return (
      <span className={cn('font-mono text-micro text-danger', className)}>
        Código no codificable como EAN-13
      </span>
    );
  }

  const printed =
    value.replace(/\D/g, '').length === 13
      ? value.replace(/\D/g, '')
      : value.replace(/\D/g, '').slice(0, 12) + ean13CheckDigit(value.replace(/\D/g, ''));

  return (
    <span className={cn('inline-flex flex-col items-center gap-0.5', className)}>
      <svg
        width={bits.length * moduleWidth}
        height={height}
        viewBox={`0 0 ${bits.length} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Código de barras ${printed}`}
        shapeRendering="crispEdges"
      >
        <rect width={bits.length} height={height} fill="#fff" />
        {bits
          .split('')
          .map((bit, i) =>
            bit === '1' ? <rect key={i} x={i} y={0} width={1} height={height} fill="#000" /> : null,
          )}
      </svg>
      {showValue && (
        <span className="font-mono text-[9px] tracking-[0.15em] text-black">{printed}</span>
      )}
    </span>
  );
};

import { describe, expect, it } from 'vitest';
// El compositor vive en el proceso principal de Electron (CommonJS): se importa
// por su ruta porque es código que imprime dinero y merece prueba.
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { buildTicket, buildLabels, buildDrawerKick, twoColumns, center, LINE_WIDTH } =
  require('../../electron/escposPrinter.cjs') as typeof import('../../electron/escposPrinter.cjs');

const TICKET = {
  companyName: 'Comercial Supero',
  companyNit: '1029384029',
  ticketNumber: 'TK-10042',
  dateText: '09/09/2026 15:04',
  paperWidth: '80mm' as const,
  subtotal: 870.25,
  discount: 0,
  total: 870.25,
  items: [
    {
      name: 'Smartphone Galaxy S23 Ultra (128GB)',
      quantity: 1,
      unitPrice: 850,
      subtotal: 850,
      serials: ['358492019482717'],
    },
    { name: 'Queso Criollo (a granel / kg)', quantity: 0.45, unitPrice: 45, subtotal: 20.25 },
  ],
  payments: [{ method: 'CASH' as const, amountReceived: 900, changeGiven: 29.75 }],
};

const asText = (buffer: Buffer) => buffer.toString('latin1');

describe('columnas del ticket', () => {
  it('alinea el importe al margen derecho', () => {
    const line = twoColumns('Subtotal', '870.25', 32);
    expect(line).toHaveLength(32);
    expect(line.endsWith('870.25')).toBe(true);
  });

  it('recorta el concepto en vez de empujar el importe fuera de la línea', () => {
    const line = twoColumns('Un nombre de producto larguísimo que no cabe', '1234.56', 24);
    expect(line).toHaveLength(24);
    expect(line.endsWith('1234.56')).toBe(true);
  });

  it('centra sin desbordar', () => {
    expect(center('Supero', 20).length).toBeLessThanOrEqual(20);
    expect(center('Un titular demasiado largo para la línea', 10)).toHaveLength(10);
  });
});

describe('composición del ticket', () => {
  it('declara la página de códigos antes del texto acentuado', () => {
    const buffer = buildTicket({ ...TICKET, cashierName: 'Juan Pérez' });
    const codepage = Buffer.from([0x1b, 0x74, 0x13]);
    // Sin ESC t, «Audífonos» sale con caracteres rotos en casi cualquier
    // impresora térmica.
    expect(buffer.indexOf(codepage)).toBeGreaterThanOrEqual(0);
    expect(buffer.indexOf(codepage)).toBeLessThan(buffer.indexOf(Buffer.from('Juan', 'latin1')));
  });

  it('respeta el ancho de papel configurado', () => {
    const wide = asText(buildTicket({ ...TICKET, paperWidth: '80mm' }));
    const narrow = asText(buildTicket({ ...TICKET, paperWidth: '58mm' }));

    expect(wide).toContain('-'.repeat(LINE_WIDTH['80mm']));
    expect(narrow).toContain('-'.repeat(LINE_WIDTH['58mm']));
    expect(narrow).not.toContain('-'.repeat(LINE_WIDTH['80mm']));
  });

  it('traduce el método de pago en vez de imprimir el enum', () => {
    const text = asText(buildTicket(TICKET));
    expect(text).toContain('Efectivo');
    expect(text).not.toContain('CASH');
  });

  it('imprime todas las series de una línea', () => {
    const text = asText(
      buildTicket({
        ...TICKET,
        items: [
          {
            name: 'Smartphone',
            quantity: 3,
            unitPrice: 850,
            subtotal: 2550,
            serials: ['358492019482717', '358492019482725', '358492019482733'],
          },
        ],
      }),
    );
    expect(text).toContain('358492019482717');
    expect(text).toContain('358492019482725');
    expect(text).toContain('358492019482733');
  });

  it('muestra la cantidad de granel con tres decimales y la unitaria sin ellos', () => {
    const text = asText(buildTicket(TICKET));
    expect(text).toContain('0.450 x 45.00');
    expect(text).toContain('1 x 850.00');
  });

  it('corta el papel al final', () => {
    const buffer = buildTicket(TICKET);
    expect(buffer.subarray(-3)).toEqual(Buffer.from([0x1d, 0x56, 0x01]));
  });

  it('omite la línea de descuento cuando no lo hay', () => {
    expect(asText(buildTicket(TICKET))).not.toContain('Descuento');
    expect(asText(buildTicket({ ...TICKET, discount: 15 }))).toContain('Descuento');
  });
});

describe('etiquetas', () => {
  it('manda el código de barras a la impresora, no un dibujo', () => {
    const buffer = buildLabels({
      productName: 'Coca Cola 2L',
      sku: 'SKU-1001',
      barcode: '7772564144935',
      price: 12.5,
      copies: 1,
      labelSize: '50x25',
    });
    // GS k 67 <longitud>: EAN-13 nativo. Unas barras pintadas no se escanean.
    expect(buffer.indexOf(Buffer.from([0x1d, 0x6b, 0x43, 13]))).toBeGreaterThanOrEqual(0);
    expect(asText(buffer)).toContain('7772564144935');
  });

  it('repite el bloque por cada copia pedida', () => {
    const one = buildLabels({
      productName: 'X',
      sku: 'S',
      barcode: '7772564144935',
      price: 1,
      copies: 1,
      labelSize: '50x25',
    });
    const three = buildLabels({
      productName: 'X',
      sku: 'S',
      barcode: '7772564144935',
      price: 1,
      copies: 3,
      labelSize: '50x25',
    });
    expect(three.length).toBeGreaterThan(one.length * 2);
  });
});

describe('cajón portamonedas', () => {
  it('envía el pulso RJ11', () => {
    expect(buildDrawerKick().includes(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
// El compositor vive en el proceso principal de Electron (CommonJS): se importa
// por su ruta porque es código que imprime dinero y merece prueba.
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { buildTicket, buildLabels, buildDrawerKick, twoColumns, center, LINE_WIDTH } =
  require('../../electron/escposPrinter.cjs') as typeof import('../../electron/escposPrinter.cjs');
const { encodePc858 } = require('../../electron/pc858.cjs');

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

/**
 * Codificación PC858.
 *
 * El compositor declaraba la página de códigos 19 con `ESC t 19` y luego
 * escribía el texto en latin1, que es otra tabla. Sobre papel, «PANADERÍA
 * ÑOÑA» salía como «PANADER═A ╤O╤A» y «¡Gracias!» como «íGracias!». Solo se
 * veía con una impresora delante, así que aquí se comprueba byte a byte.
 */
describe('codificación PC858', () => {
  const { encodePc858 } = require('../../electron/pc858.cjs') as {
    encodePc858: (text: string) => Buffer;
  };

  const bytes = (text: string) => [...encodePc858(text)];

  it('el ASCII pasa tal cual', () => {
    expect(bytes('Total: 25.00')).toEqual([...Buffer.from('Total: 25.00', 'ascii')]);
  });

  it('las vocales acentuadas usan la tabla de PC858, no la de latin1', () => {
    // En latin1 serían e1 e9 ed f3 fa; en PC858 son a0 82 a1 a2 a3.
    expect(bytes('áéíóú')).toEqual([0xa0, 0x82, 0xa1, 0xa2, 0xa3]);
    expect(bytes('ÁÉÍÓÚ')).toEqual([0xb5, 0x90, 0xd6, 0xe0, 0xe9]);
  });

  it('la eñe y la diéresis salen bien en las dos cajas', () => {
    expect(bytes('ñÑüÜ')).toEqual([0xa4, 0xa5, 0x81, 0x9a]);
  });

  it('la apertura de exclamación y de interrogación no son las de latin1', () => {
    // Enviar 0xa1 (el «¡» de latin1) hacía que la impresora escribiera «í».
    expect(bytes('¡¿')).toEqual([0xad, 0xa8]);
  });

  it('el euro existe en PC858, que es lo que lo distingue de PC850', () => {
    expect(bytes('€')).toEqual([0xd5]);
  });

  it('las comillas tipográficas se sustituyen por rectas en vez de imprimir basura', () => {
    expect(bytes('“hola” ‘eso’ — …')).toEqual([...Buffer.from('"hola" \'eso\' - ...', 'ascii')]);
  });

  it('una letra fuera de la tabla pierde la tilde antes que imprimir un símbolo', () => {
    // «Ǎ» no está en PC858; se prefiere una «A» legible.
    expect(bytes('Ǎ')).toEqual([0x41]);
  });

  it('lo que no tiene ninguna equivalencia sale como interrogante, no como ruido', () => {
    expect(bytes('漢')).toEqual([0x3f]);
  });

  it('el ticket completo lleva la razón social acentuada en PC858', () => {
    const buffer = buildTicket({
      ...TICKET,
      companyName: 'PANADERÍA ÑOÑA',
      footerText: '¡Gracias!',
    });
    // 0xd6 = Í y 0xa5 = Ñ. Con latin1 habrían sido 0xcd y 0xd1.
    expect([...buffer]).toContain(0xd6);
    expect([...buffer]).toContain(0xa5);
    expect([...buffer]).toContain(0xad); // ¡
    expect([...buffer]).not.toContain(0xcd); // la «Í» de latin1 ya no aparece
  });

  it('declara la página de códigos que después cumple', () => {
    const buffer = buildTicket(TICKET);
    // ESC t 19 (0x1b 0x74 0x13) = PC858.
    const head = [...buffer.subarray(0, 8)];
    expect(head).toEqual(expect.arrayContaining([0x1b, 0x74, 0x13]));
  });
});

/**
 * La longitud de un `GS k 67` la declara quien emite y la impresora lee
 * exactamente esos bytes. Declararla contando caracteres en vez de bytes rompe
 * la trama en cuanto aparece un carácter que PC858 no tiene: lo que sobra se
 * interpreta como comandos y la etiqueta —y las copias siguientes— salen mal.
 */
describe('etiquetas · la longitud del código de barras se cuenta en bytes', () => {
  const ETIQUETA = {
    productName: 'Audífonos Bluetooth',
    sku: 'ELEC-0031',
    barcode: '7501234567890',
    price: 35,
    copies: 1,
    labelSize: '50x25' as const,
  };

  const bytesTrasGsK = (buf: Buffer) => {
    const i = buf.indexOf(Buffer.from([0x1d, 0x6b, 0x43]));
    return { indice: i, declarada: i < 0 ? -1 : buf[i + 3] };
  };

  it('declara tantos bytes como manda', () => {
    const salida = buildLabels(ETIQUETA);
    const { indice, declarada } = bytesTrasGsK(salida);
    expect(indice).toBeGreaterThan(-1);
    expect(declarada).toBe(13);

    // Y los trece bytes siguientes son, en efecto, el código.
    const datos = salida.subarray(indice + 4, indice + 4 + declarada);
    expect(datos.toString('latin1')).toBe('7501234567890');
  });

  it('no emite una trama de barras con un código que no es EAN', () => {
    const salida = buildLabels({ ...ETIQUETA, barcode: 'SIN-CÓDIGO…' });
    expect(bytesTrasGsK(salida).indice).toBe(-1);
    // Se imprime como texto, para que quien mira la etiqueta lo vea.
    expect(salida.toString('latin1')).toContain('(SIN-C');
  });

  it('alinea las columnas por lo que se imprime, no por la cadena', () => {
    // «…» no existe en PC858 y sale como tres puntos: ocupa tres columnas.
    const linea = twoColumns('Café…', '9.90', 20);
    const impreso = encodePc858(linea).toString('latin1');
    expect(impreso).toHaveLength(20);
    expect(impreso.endsWith('9.90')).toBe(true);
  });
});

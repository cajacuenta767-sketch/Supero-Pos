/**
 * Codificación de texto para la impresora térmica: Unicode → PC858.
 *
 * El módulo declaraba la página de códigos 19 (PC858) con `ESC t 19` y luego
 * escribía el texto en latin1. No son la misma tabla: en latin1 la «Í» es 0xCD,
 * y en PC858 el byte 0xCD es «═». Sobre papel, «PANADERÍA ÑOÑA» salía impreso
 * como «PANADER═A ╤O╤A», y «¡Gracias!» como «íGracias!». Todo acento, toda eñe
 * y toda apertura de exclamación salían mal, en cada ticket, y no había forma
 * de verlo sin una impresora delante.
 *
 * PC858 es PC850 con el euro en 0xD5. Aquí está la mitad alta que le hace falta
 * a un ticket en español, más las comillas y guiones que se cuelan al copiar y
 * pegar desde un procesador de textos.
 */

/** Unicode → byte de PC858, solo para lo que no es ASCII. */
const PC858 = new Map(
  Object.entries({
    Ç: 0x80,
    ü: 0x81,
    é: 0x82,
    â: 0x83,
    ä: 0x84,
    à: 0x85,
    å: 0x86,
    ç: 0x87,
    ê: 0x88,
    ë: 0x89,
    è: 0x8a,
    ï: 0x8b,
    î: 0x8c,
    ì: 0x8d,
    Ä: 0x8e,
    Å: 0x8f,
    É: 0x90,
    æ: 0x91,
    Æ: 0x92,
    ô: 0x93,
    ö: 0x94,
    ò: 0x95,
    û: 0x96,
    ù: 0x97,
    ÿ: 0x98,
    Ö: 0x99,
    Ü: 0x9a,
    ø: 0x9b,
    '£': 0x9c,
    Ø: 0x9d,
    '×': 0x9e,
    ƒ: 0x9f,
    á: 0xa0,
    í: 0xa1,
    ó: 0xa2,
    ú: 0xa3,
    ñ: 0xa4,
    Ñ: 0xa5,
    ª: 0xa6,
    º: 0xa7,
    '¿': 0xa8,
    '®': 0xa9,
    '¬': 0xaa,
    '½': 0xab,
    '¼': 0xac,
    '¡': 0xad,
    '«': 0xae,
    '»': 0xaf,
    Á: 0xb5,
    Â: 0xb6,
    À: 0xb7,
    '©': 0xb8,
    ã: 0xc6,
    Ã: 0xc7,
    ð: 0xd0,
    Ð: 0xd1,
    Ê: 0xd2,
    Ë: 0xd3,
    È: 0xd4,
    '€': 0xd5,
    Í: 0xd6,
    Î: 0xd7,
    Ï: 0xd8,
    '¦': 0xdd,
    Ì: 0xde,
    Ó: 0xe0,
    ß: 0xe1,
    Ô: 0xe2,
    Ò: 0xe3,
    õ: 0xe4,
    Õ: 0xe5,
    µ: 0xe6,
    þ: 0xe7,
    Þ: 0xe8,
    Ú: 0xe9,
    Û: 0xea,
    Ù: 0xeb,
    ý: 0xec,
    Ý: 0xed,
    '¯': 0xee,
    '´': 0xef,
    '±': 0xf1,
    '¾': 0xf3,
    '¶': 0xf4,
    '§': 0xf5,
    '÷': 0xf6,
    '¸': 0xf7,
    '°': 0xf8,
    '¨': 0xf9,
    '·': 0xfa,
    '¹': 0xfb,
    '³': 0xfc,
    '²': 0xfd,
    '■': 0xfe,
  }),
);

/**
 * Sustitutos en ASCII para lo que PC858 no tiene.
 *
 * Un carácter sin equivalencia imprimiría un símbolo cualquiera. Antes de eso
 * es preferible una comilla recta: se entiende y no ensucia el ticket. Son los
 * que se cuelan al pegar texto desde un procesador de textos.
 */
const FALLBACK = new Map(
  Object.entries({
    '“': '"',
    '”': '"',
    '„': '"',
    '‘': "'",
    '’': "'",
    '‚': "'",
    '–': '-',
    '—': '-',
    '−': '-',
    '…': '...',
    ' ': ' ',
    '™': 'TM',
    '‹': '<',
    '›': '>',
    '•': '*',
  }),
);

/** Quita la tilde de una letra que no esté en la tabla, antes que imprimir basura. */
const stripAccent = (char) => char.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Convierte texto a bytes PC858.
 *
 * @param {string} text
 * @returns {Buffer}
 */
function encodePc858(text) {
  const out = [];

  for (const char of String(text)) {
    const code = char.codePointAt(0);

    // ASCII imprimible, salto de línea y tabulador pasan tal cual.
    if (code < 0x80) {
      out.push(code);
      continue;
    }

    const mapped = PC858.get(char);
    if (mapped !== undefined) {
      out.push(mapped);
      continue;
    }

    const substitute = FALLBACK.get(char);
    if (substitute !== undefined) {
      for (const c of substitute) out.push(c.codePointAt(0) & 0x7f);
      continue;
    }

    /* Última salida: la letra sin tilde. «Ǎ» no está en PC858, pero «A» se lee.
       Si ni eso, un interrogante, que al menos avisa de que faltó algo. */
    const bare = stripAccent(char);
    if (bare && bare !== char && bare.codePointAt(0) < 0x80) {
      out.push(bare.codePointAt(0));
    } else {
      out.push(0x3f); // '?'
    }
  }

  return Buffer.from(out);
}

module.exports = { encodePc858 };

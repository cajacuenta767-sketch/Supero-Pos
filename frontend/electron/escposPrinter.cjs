const { encodePc858, anchoImpreso } = require('./pc858.cjs');
// Composición de tramas ESC/POS para impresora térmica y cajón portamonedas.

const ESC_POS = {
  INIT: Buffer.from([0x1b, 0x40]), // ESC @  — inicializa
  /* Página de códigos 19 = PC858 (multilingüe con € y vocales acentuadas).
     Se declara aquí y se cumple en `pc858.cjs`: durante un tiempo se declaraba
     PC858 y se escribía latin1, que es otra tabla, y sobre papel «PANADERÍA»
     salía «PANADER═A».
     Antes de eso se enviaba texto en latin1 sin declarar página de códigos, así que
     «Audífonos» salía con caracteres rotos en casi cualquier impresora. */
  CODEPAGE_PC858: Buffer.from([0x1b, 0x74, 0x13]), // ESC t 19
  ALIGN_CENTER: Buffer.from([0x1b, 0x61, 0x01]),
  ALIGN_LEFT: Buffer.from([0x1b, 0x61, 0x00]),
  BOLD_ON: Buffer.from([0x1b, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([0x1b, 0x45, 0x00]),
  DOUBLE_ON: Buffer.from([0x1d, 0x21, 0x11]), // GS ! — doble alto y ancho
  DOUBLE_OFF: Buffer.from([0x1d, 0x21, 0x00]),
  FEED_3: Buffer.from([0x1b, 0x64, 0x03]), // ESC d 3 — avanza para cortar
  CUT_PAPER: Buffer.from([0x1d, 0x56, 0x01]), // GS V 1
  DRAWER_KICK: Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]), // ESC p 0
};

/** Vocabulario de producto en el ticket del cliente: nadie compra con 'CASH'. */
const PAYMENT_LABEL = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  QR: 'Pago QR',
  MIXED: 'Pago mixto',
};

/** Caracteres por línea según el ancho del papel, a 12 puntos por milímetro. */
const LINE_WIDTH = { '80mm': 48, '58mm': 32 };

const money = (value) => Number(value ?? 0).toFixed(2);

/**
 * Recorta y rellena para que importes y conceptos queden en columnas.
 *
 * El relleno se mide en columnas impresas, no en caracteres de la cadena: hay
 * caracteres que no existen en PC858 y se sustituyen por varios —«…» por tres
 * puntos—, así que contar la cadena descuadra la columna de importes en
 * justamente las líneas con nombres largos.
 */
function twoColumns(left, right, width) {
  const rightText = String(right);
  const room = Math.max(0, width - anchoImpreso(rightText) - 1);
  let leftText = String(left);
  while (anchoImpreso(leftText) > room) leftText = leftText.slice(0, -1);
  const hueco = width - anchoImpreso(leftText) - anchoImpreso(rightText);
  return `${leftText}${' '.repeat(Math.max(1, hueco))}${rightText}`;
}

function center(text, width) {
  let value = String(text);
  while (anchoImpreso(value) > width) value = value.slice(0, -1);
  const pad = Math.max(0, Math.floor((width - anchoImpreso(value)) / 2));
  return `${' '.repeat(pad)}${value}`;
}

/**
 * Compone el ticket.
 *
 * Respeta el ancho de papel configurado en Ajustes y los datos de empresa de la
 * plantilla: antes las medidas estaban fijas a 30 caracteres y la configuración
 * de 58/80 mm no la consumía nadie.
 */
function buildTicket(ticket) {
  const width = LINE_WIDTH[ticket.paperWidth] ?? LINE_WIDTH['80mm'];
  const rule = '-'.repeat(width);
  const lines = [];

  lines.push(center(ticket.companyName ?? 'SUPERO POS', width));
  if (ticket.companyNit) lines.push(center(`NIT: ${ticket.companyNit}`, width));
  if (ticket.branchName) lines.push(center(ticket.branchName, width));
  lines.push(rule);
  lines.push(`Ticket: ${ticket.ticketNumber ?? '-'}`);
  lines.push(`Fecha:  ${ticket.dateText ?? new Date().toLocaleString('es-BO')}`);
  if (ticket.cashierName) lines.push(`Cajero: ${ticket.cashierName}`);
  if (ticket.customerName) lines.push(`Cliente: ${ticket.customerName}`);
  lines.push(rule);

  for (const item of ticket.items ?? []) {
    lines.push(String(item.name).slice(0, width));
    const qty = Number(item.quantity);
    const qtyText = Number.isInteger(qty) ? String(qty) : qty.toFixed(3);
    lines.push(twoColumns(`  ${qtyText} x ${money(item.unitPrice)}`, money(item.subtotal), width));
    for (const serial of item.serials ?? []) {
      lines.push(`  IMEI: ${serial}`.slice(0, width));
    }
  }

  lines.push(rule);
  lines.push(twoColumns('Subtotal', money(ticket.subtotal), width));
  if (Number(ticket.discount) > 0) {
    lines.push(twoColumns('Descuento', `-${money(ticket.discount)}`, width));
  }

  const payments = ticket.payments ?? [];
  const body = lines.join('\n') + '\n';

  const totalLine = twoColumns('TOTAL', money(ticket.total), width) + '\n';

  const tail = [];
  for (const payment of payments) {
    tail.push(
      twoColumns(
        PAYMENT_LABEL[payment.method] ?? payment.method,
        money(payment.amountReceived),
        width,
      ),
    );
    if (Number(payment.changeGiven) > 0) {
      tail.push(twoColumns('  Cambio', money(payment.changeGiven), width));
    }
  }
  tail.push(rule);
  tail.push(center(ticket.footerText ?? '¡Gracias por su compra!', width));
  tail.push('');

  return Buffer.concat([
    ESC_POS.INIT,
    ESC_POS.CODEPAGE_PC858,
    ESC_POS.ALIGN_LEFT,
    encodePc858(body),
    ESC_POS.BOLD_ON,
    ESC_POS.DOUBLE_ON,
    encodePc858(totalLine),
    ESC_POS.DOUBLE_OFF,
    ESC_POS.BOLD_OFF,
    encodePc858(tail.join('\n') + '\n'),
    ESC_POS.FEED_3,
    ESC_POS.CUT_PAPER,
  ]);
}

/**
 * Etiqueta de estantería con su EAN-13.
 *
 * El código se manda con `GS k` para que lo dibuje la propia impresora: un
 * código pintado como texto o como barras aproximadas no lo lee ningún escáner,
 * que es justo para lo que sirve la etiqueta.
 */
/**
 * Bloque `GS k 67` con la longitud contada en bytes, no en caracteres.
 *
 * La longitud la declara el emisor y la impresora lee exactamente esos bytes.
 * Si se declaran menos de los que se mandan, los sobrantes se interpretan como
 * comandos: el resto de la etiqueta —y todas las copias siguientes del mismo
 * envío— salen corruptas. Se declaraba `job.barcode.length`, la longitud de la
 * cadena, que no coincide con la de los bytes en cuanto aparece un carácter
 * fuera de PC858.
 *
 * Un EAN-13 son trece dígitos. Si lo que llega no lo es, se imprime como texto
 * en vez de emitir una trama que la impresora no puede dibujar: una etiqueta
 * sin barras se ve y se corrige; una trama rota estropea el lote entero.
 */
function codigoDeBarras(codigo) {
  const valor = String(codigo ?? '');
  const datos = encodePc858(valor);

  if (!/^[0-9]{12,13}$/.test(valor)) {
    return [encodePc858(`(${valor})`)];
  }

  return [Buffer.from([0x1d, 0x6b, 0x43, datos.length]), datos];
}

function buildLabels(job) {
  const width = job.labelSize === '40x20' ? 24 : 32;
  const blocks = [ESC_POS.INIT, ESC_POS.CODEPAGE_PC858];

  for (let copy = 0; copy < Math.max(1, Number(job.copies) || 1); copy++) {
    const header = `${String(job.productName).slice(0, width)}\n${job.sku}\n`;
    const price = twoColumns('Bs.', Number(job.price ?? 0).toFixed(2), width) + '\n';

    blocks.push(
      ESC_POS.ALIGN_CENTER,
      encodePc858(header),
      // GS h 64: alto de barras. GS w 2: ancho de módulo. GS H 2: texto debajo.
      Buffer.from([0x1d, 0x68, 0x40]),
      Buffer.from([0x1d, 0x77, 0x02]),
      Buffer.from([0x1d, 0x48, 0x02]),
      // GS k 67 <len> <datos>: EAN-13 en el modo con longitud explícita.
      ...codigoDeBarras(job.barcode),
      encodePc858('\n'),
      ESC_POS.BOLD_ON,
      encodePc858(price),
      ESC_POS.BOLD_OFF,
      ESC_POS.FEED_3,
      ESC_POS.CUT_PAPER,
    );
  }

  return Buffer.concat(blocks);
}

function buildDrawerKick() {
  return Buffer.concat([ESC_POS.INIT, ESC_POS.DRAWER_KICK]);
}

module.exports = {
  ESC_POS,
  LINE_WIDTH,
  PAYMENT_LABEL,
  buildTicket,
  buildLabels,
  buildDrawerKick,
  twoColumns,
  center,
};

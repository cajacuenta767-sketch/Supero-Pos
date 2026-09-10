import { BadRequestException } from '@nestjs/common';

/**
 * Comprueba que una venta cuadre consigo misma.
 *
 * La regla vivía solo en `sync.service.ts`, que es por donde entra la terminal.
 * `POST /sales/checkout` es la otra puerta al mismo sitio y no comprobaba nada:
 * un cajero podía declarar tres auriculares de 35 Bs por un céntimo y la venta
 * se registraba, con el stock descontado correctamente y la caja cuadrando en
 * 0,01. Comprobado contra la API real antes de escribir esto.
 *
 * Una sola función para las dos puertas: si mañana se afina el criterio, se
 * afina en los dos sitios a la vez, que es justo lo que no pasó la primera vez.
 */
export function comprobarQueLosImportesCuadran(venta: {
  lineas: number[];
  subtotal: number;
  descuento?: number;
  total: number;
  cobradoNeto?: number;
}): void {
  /* Los importes llegan con hasta cuatro decimales y el dinero tiene dos: un
     céntimo de holgura por línea absorbe el redondeo sin dejar pasar una
     diferencia real. */
  const holgura = Math.max(0.01, venta.lineas.length * 0.01);

  const sumaLineas = venta.lineas.reduce((sum, linea) => sum + linea, 0);
  if (Math.abs(sumaLineas - venta.subtotal) > holgura) {
    throw new BadRequestException(
      `Las líneas suman ${sumaLineas.toFixed(2)} y el subtotal declarado es ` +
        `${venta.subtotal.toFixed(2)}.`,
    );
  }

  const esperado = venta.subtotal - (venta.descuento ?? 0);
  if (Math.abs(esperado - venta.total) > holgura) {
    throw new BadRequestException(
      `El total declarado (${venta.total.toFixed(2)}) no es el subtotal menos ` +
        `el descuento (${esperado.toFixed(2)}).`,
    );
  }

  /* Lo cobrado, descontado el cambio, tiene que cubrir el total. Por debajo es
     una venta regalada; muy por encima, un error de captura. */
  if (venta.cobradoNeto !== undefined && venta.cobradoNeto - venta.total < -holgura) {
    throw new BadRequestException(
      `Lo cobrado (${venta.cobradoNeto.toFixed(2)}) no cubre el total ` +
        `(${venta.total.toFixed(2)}).`,
    );
  }
}

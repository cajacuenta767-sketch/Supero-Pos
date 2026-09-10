import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchSyncDto, TransactionDto } from './dto/batch-sync.dto';

/**
 * Tasa de IVA aplicada al desglose del ticket.
 *
 * En Bolivia los precios se muestran con el impuesto incluido, así que el
 * importe gravado se obtiene desde el total, no sumándolo encima. Antes se
 * guardaba `tax: 0` en todas las ventas y el libro fiscal quedaba vacío.
 */
const TAX_RATE = Number(process.env.TAX_RATE ?? '0.13');

export interface SyncResultError {
  transaction_id: string;
  error: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Ingesta del lote de ventas offline.
   *
   * Devuelve la lista de transacciones efectivamente confirmadas. El cliente
   * borra de su cola local **solo** las que aparecen ahí: antes la respuesta
   * era `success: true` incondicional y el cliente borraba también las que
   * habían fallado, de modo que una venta podía desaparecer de los dos lados
   * sin dejar rastro.
   */
  async processBatchSync(payload: BatchSyncDto) {
    const processed: string[] = [];
    const errors: SyncResultError[] = [];

    for (const tx of payload.transactions) {
      try {
        await this.persistTransaction(tx);
        processed.push(tx.transaction_id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fallo al procesar la transacción';
        this.logger.error(
          `Transacción ${tx.transaction_id} rechazada (terminal ${payload.terminal_id}): ${message}`,
        );
        errors.push({ transaction_id: tx.transaction_id, error: message });
      }
    }

    return {
      // Solo hay éxito si el lote entero entró. Con una sola caída, el cliente
      // debe conservar lo que no se confirmó.
      success: errors.length === 0,
      status_code: 200,
      processed_count: processed.length,
      failed_count: errors.length,
      /** Identificadores que el cliente puede borrar de su cola local. */
      processed_ids: processed,
      errors,
    };
  }

  /**
   * Comprueba que los importes de la venta cuadren entre sí.
   *
   * El servidor no puede volver a tarifar: la terminal fija el precio sin
   * conexión, con sus descuentos y sus precios mayoristas, y esa es la premisa
   * de todo el sistema. Pero sí puede exigir que las cuentas cierren, que es
   * aritmética y no depende de ningún catálogo.
   *
   * Antes guardaba `subtotal` y `grand_total` tal como venían: una venta cuya
   * cabecera dijera 5 Bs y cuyas líneas sumaran 500 entraba en los libros sin
   * que nada la mirara. Sea manipulación o un fallo del cliente, una venta que
   * no cuadra consigo misma no se registra en silencio: se rechaza y se queda
   * en la cola de la terminal, que es donde se puede investigar.
   */
  private assertAmountsAddUp(tx: TransactionDto): void {
    /* Los importes llegan con hasta cuatro decimales y el dinero tiene dos:
       un céntimo de holgura por línea absorbe el redondeo sin dejar pasar una
       diferencia real. */
    const holgura = Math.max(0.01, tx.items.length * 0.01);

    const sumaLineas = tx.items.reduce((sum, item) => sum + item.line_subtotal, 0);
    if (Math.abs(sumaLineas - tx.subtotal) > holgura) {
      throw new BadRequestException(
        `Las líneas suman ${sumaLineas.toFixed(2)} y el subtotal declarado es ` +
          `${tx.subtotal.toFixed(2)}.`,
      );
    }

    const esperado = tx.subtotal - tx.total_discount;
    if (Math.abs(esperado - tx.grand_total) > holgura) {
      throw new BadRequestException(
        `El total declarado (${tx.grand_total.toFixed(2)}) no es el subtotal menos ` +
          `el descuento (${esperado.toFixed(2)}).`,
      );
    }

    /* Lo cobrado, descontado el cambio, tiene que cubrir el total. Por debajo
       es una venta regalada; muy por encima, un error de captura. */
    const cobradoNeto = tx.payment_breakdown.reduce(
      (sum, p) => sum + p.amount_received - p.change_given,
      0,
    );
    if (cobradoNeto - tx.grand_total < -holgura) {
      throw new BadRequestException(
        `Lo cobrado (${cobradoNeto.toFixed(2)}) no cubre el total ` +
          `(${tx.grand_total.toFixed(2)}).`,
      );
    }
  }

  private async persistTransaction(tx: TransactionDto): Promise<void> {
    /* Idempotencia por el UUID completo. Antes el número de ticket se formaba
       con los 8 primeros caracteres del UUID —32 bits—: hacia los 77.000
       tickets la probabilidad de que dos ventas distintas colisionaran y una se
       descartara como duplicada superaba el 50 %. */
    const existing = await this.prisma.sale.findUnique({ where: { id: tx.transaction_id } });
    if (existing) {
      this.logger.log(`Transacción ${tx.transaction_id} ya registrada; no se duplica.`);
      return;
    }

    this.assertAmountsAddUp(tx);

    const keys = await this.resolveForeignKeys(tx);
    const taxable = this.taxFromGrossTotal(tx.grand_total);
    const primaryMethod = this.primaryPaymentMethod(tx);
    const totalReceived = tx.payment_breakdown.reduce((sum, p) => sum + p.amount_received, 0);
    const totalChange = tx.payment_breakdown.reduce((sum, p) => sum + p.change_given, 0);

    await this.prisma.$transaction(async (db) => {
      const sale = await db.sale.create({
        data: {
          id: tx.transaction_id,
          ticketNumber: `OFFLINE-${tx.transaction_id}`,
          branchId: keys.branchId,
          registerId: keys.registerId,
          shiftId: keys.shiftId,
          userId: keys.userId,
          customerId: keys.customerId,
          subtotal: new Prisma.Decimal(tx.subtotal),
          tax: new Prisma.Decimal(taxable),
          totalAmount: new Prisma.Decimal(tx.grand_total),
          paymentMethod: primaryMethod,
          receivedAmount: new Prisma.Decimal(totalReceived),
          changeAmount: new Prisma.Decimal(totalChange),
          customerSignature: tx.customer_signature ?? null,
          status: 'COMPLETED',
          createdAt: new Date(tx.timestamp),
        },
      });

      // Desglose real por método: es lo que permite cuadrar el arqueo.
      await db.salePayment.createMany({
        data: tx.payment_breakdown.map((p) => ({
          saleId: sale.id,
          paymentMethod: p.payment_method,
          amountReceived: new Prisma.Decimal(p.amount_received),
          changeGiven: new Prisma.Decimal(p.change_given),
        })),
      });

      for (const item of tx.items) {
        const product = await db.product.findUnique({ where: { id: item.product_id } });
        if (!product) {
          /* Antes se creaba el producto sobre la marcha con el id que llegara:
             un identificador mal escrito generaba un producto fantasma en el
             catálogo en vez de fallar. */
          throw new NotFoundException(
            `El producto ${item.product_id} no existe en el catálogo central.`,
          );
        }

        const serials = item.serials_used ?? [];
        if (serials.length > 0) {
          const { count } = await db.productSerial.updateMany({
            where: { serialNumber: { in: serials }, productId: product.id },
            data: { status: 'SOLD' },
          });
          if (count !== serials.length) {
            this.logger.warn(
              `Venta ${sale.id}: ${serials.length - count} de ${serials.length} series del producto ` +
                `${product.id} no estaban registradas; la venta se registra igual pero quedan sin trazabilidad.`,
            );
          }
        }

        await db.saleItem.create({
          data: {
            saleId: sale.id,
            productId: product.id,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unit_price),
            subtotal: new Prisma.Decimal(item.line_subtotal),
            serialsUsed: serials.length > 0 ? serials : Prisma.DbNull,
          },
        });

        const stock = await db.stock.findUnique({
          where: { productId_branchId: { productId: product.id, branchId: keys.branchId } },
        });
        const before = stock ? Number(stock.quantity) : 0;
        const after = before - item.quantity;

        /* El stock puede quedar negativo: la venta ya ocurrió físicamente y
           rechazarla aquí la haría desaparecer. Se registra tal cual y se avisa
           para que alguien concilie, en lugar de corregirlo por lo bajo. */
        if (after < 0) {
          this.logger.warn(
            `Stock negativo tras la venta ${sale.id}: producto ${product.id} en sucursal ` +
              `${keys.branchId} queda en ${after}. Requiere conciliación.`,
          );
        }

        if (stock) {
          await db.stock.update({
            where: { id: stock.id },
            data: { quantity: new Prisma.Decimal(after) },
          });
        } else {
          await db.stock.create({
            data: {
              productId: product.id,
              branchId: keys.branchId,
              quantity: new Prisma.Decimal(after),
            },
          });
        }

        await db.kardexMovement.create({
          data: {
            productId: product.id,
            branchId: keys.branchId,
            movementType: 'SALE',
            referenceId: sale.id,
            quantityChange: new Prisma.Decimal(-item.quantity),
            stockBefore: new Prisma.Decimal(before),
            stockAfter: new Prisma.Decimal(after),
            unitCost: new Prisma.Decimal(item.unit_price),
          },
        });
      }
    });
  }

  /** Importe de IVA contenido en un total que ya lo lleva incluido. */
  private taxFromGrossTotal(grossTotal: number): number {
    if (TAX_RATE <= 0) return 0;
    return Number(((grossTotal * TAX_RATE) / (1 + TAX_RATE)).toFixed(4));
  }

  private primaryPaymentMethod(tx: TransactionDto) {
    const methods = new Set(tx.payment_breakdown.map((p) => p.payment_method));
    if (methods.size > 1) return 'MIXED' as const;
    return tx.payment_breakdown[0].payment_method;
  }

  /**
   * Comprueba que las entidades referenciadas existen.
   *
   * Antes esta función las **creaba**: si la sucursal no existía usaba «la
   * primera que encontrara», con lo que una venta con `branch_id` erróneo se
   * contabilizaba en la caja de otra tienda sin error alguno; y si el cajero no
   * existía creaba un usuario con rol Admin y `passwordHash: 'hash_placeholder'`.
   * Ahora falla, y el cliente conserva la venta hasta que se corrija.
   */
  private async resolveForeignKeys(tx: TransactionDto) {
    const [branch, register, shift, user] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: tx.branch_id } }),
      this.prisma.cashRegister.findUnique({ where: { id: tx.register_id } }),
      this.prisma.cashShift.findUnique({ where: { id: tx.shift_id } }),
      this.prisma.user.findUnique({ where: { id: tx.cashier_id } }),
    ]);

    const missing: string[] = [];
    if (!branch) missing.push(`sucursal ${tx.branch_id}`);
    if (!register) missing.push(`caja ${tx.register_id}`);
    if (!shift) missing.push(`turno ${tx.shift_id}`);
    if (!user) missing.push(`cajero ${tx.cashier_id}`);
    if (missing.length > 0) {
      throw new NotFoundException(`Referencias inexistentes en la venta: ${missing.join(', ')}.`);
    }

    let customerId: string | null = null;
    if (tx.customer_id) {
      const customer = await this.prisma.customer.findUnique({ where: { id: tx.customer_id } });
      if (!customer) {
        throw new NotFoundException(`El cliente ${tx.customer_id} no existe.`);
      }
      customerId = customer.id;
    }

    return {
      branchId: branch!.id,
      registerId: register!.id,
      shiftId: shift!.id,
      userId: user!.id,
      customerId,
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { comprobarQueLosImportesCuadran } from '../../common/importes';
import { CheckoutPayload } from './dto/checkout.dto';

export { CheckoutPayload };


@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    @Optional() private auditService?: AuditService,
  ) {}

  /**
   * Comprueba que el turno declarado sea uno en el que esta persona pueda
   * vender, y que la caja sea la de ese turno.
   *
   * Antes no se miraba: bastaba mandar el identificador del turno de otro
   * compañero para que la venta —y el efectivo que debía haber en la gaveta—
   * quedara colgada de su arqueo. Es la misma estafa que ya se cerró al cerrar
   * turno, por la puerta de al lado.
   */
  private async assertTurnoUtilizable(payload: CheckoutPayload) {
    const shift = await this.prisma.cashShift.findUnique({
      where: { id: payload.shiftId },
      include: { register: true },
    });

    if (!shift) {
      throw new NotFoundException(`El turno de caja #${payload.shiftId} no existe.`);
    }

    if (shift.status !== 'ACTIVE') {
      throw new BadRequestException(
        'El turno de caja ya está cerrado: no se pueden registrar ventas en él.',
      );
    }

    if (shift.registerId !== payload.registerId) {
      throw new BadRequestException('La caja indicada no es la del turno abierto.');
    }

    if (shift.register.branchId !== payload.branchId) {
      throw new ForbiddenException('Esa caja pertenece a otra sucursal.');
    }

    const esSuyo = shift.userId === payload.userId;
    const esResponsableDeLaSucursal =
      (payload.role === 'ADMIN' || payload.role === 'SUPERVISOR') &&
      shift.register.branchId === payload.branchId;

    if (!esSuyo && !esResponsableDeLaSucursal) {
      throw new ForbiddenException('Ese turno de caja no es suyo.');
    }
  }

  /**
   * Comprueba que cada línea se cobre al precio del catálogo.
   *
   * Este contrato no tiene campo de descuento: no hay forma legítima de que el
   * precio venga de otro sitio. Sin la comprobación, el cliente elegía el
   * precio —tres auriculares de 35 Bs por un céntimo, verificado contra la API
   * real—, y como el resto de la venta cuadraba consigo misma, todo lo demás
   * pasaba: el stock se descontaba bien y la caja cuadraba en 0,01.
   *
   * Se acepta el precio mayorista cuando la cantidad llega al mínimo, porque
   * eso sí lo define el catálogo.
   */
  private async assertPreciosDelCatalogo(payload: CheckoutPayload) {
    for (const item of payload.items) {
      const producto = await this.prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          name: true,
          retailPrice: true,
          wholesalePrice: true,
          wholesaleMinQty: true,
        },
      });

      if (!producto) {
        throw new BadRequestException(`El producto ${item.productId} no existe en el catálogo.`);
      }

      const retail = Number(producto.retailPrice);
      const mayorista = producto.wholesalePrice === null ? retail : Number(producto.wholesalePrice);
      const minimoMayorista = Number(producto.wholesaleMinQty ?? 0);
      const aplicaMayorista = minimoMayorista > 0 && item.quantity >= minimoMayorista;

      const minimoAceptable = aplicaMayorista ? Math.min(mayorista, retail) : retail;

      if (item.unitPrice < minimoAceptable - 0.01) {
        throw new BadRequestException(
          `El precio de '${producto.name}' (${item.unitPrice.toFixed(2)}) está por debajo ` +
            `del de catálogo (${minimoAceptable.toFixed(2)}).`,
        );
      }

      const esperado = item.unitPrice * item.quantity;
      if (Math.abs(esperado - item.subtotal) > 0.01) {
        throw new BadRequestException(
          `La línea de '${producto.name}' declara ${item.subtotal.toFixed(2)} y ` +
            `${item.quantity} × ${item.unitPrice.toFixed(2)} son ${esperado.toFixed(2)}.`,
        );
      }
    }
  }

  // 1. Transactional Checkout Endpoint with ACID Rollback & Kardex Movement Logging
  async checkout(payload: CheckoutPayload) {
    if (!payload.items || payload.items.length === 0) {
      throw new BadRequestException('El carrito de venta no contiene productos.');
    }

    await this.assertTurnoUtilizable(payload);
    await this.assertPreciosDelCatalogo(payload);

    /* La misma regla que ya aplica la cola de sincronización, en la función
       que comparten: una venta tiene que cuadrar consigo misma. */
    comprobarQueLosImportesCuadran({
      lineas: payload.items.map((item) => item.subtotal),
      subtotal: payload.subtotal,
      total: payload.totalAmount,
      cobradoNeto: payload.receivedAmount - payload.changeAmount,
    });

    return await this.prisma.$transaction(async (tx) => {
      // 1. Verify Stock & Serial availability
      for (const item of payload.items) {
        const stockRecord = await tx.stock.findUnique({
          where: { productId_branchId: { productId: item.productId, branchId: payload.branchId } },
        });

        if (stockRecord && Number(stockRecord.quantity) < item.quantity) {
          throw new BadRequestException(`Stock insuficiente para el producto ${item.productId}. Disponible: ${stockRecord.quantity}`);
        }

        if (item.serialsUsed && item.serialsUsed.length > 0) {
          for (const serialNum of item.serialsUsed) {
            const serialRecord = await tx.productSerial.findUnique({
              where: { serialNumber: serialNum },
            });
            if (!serialRecord || serialRecord.status !== 'IN_STOCK') {
              throw new BadRequestException(`El número de serie / IMEI ${serialNum} no está disponible en inventario.`);
            }
          }
        }
      }

      // 2. Create Sale Header sealed with userId and branchId
      const sale = await tx.sale.create({
        data: {
          ticketNumber: payload.ticketNumber || `TKT-${Date.now()}`,
          branchId: payload.branchId,
          registerId: payload.registerId,
          shiftId: payload.shiftId,
          userId: payload.userId,
          customerId: payload.customerId || null,
          subtotal: payload.subtotal,
          tax: payload.tax || 0,
          totalAmount: payload.totalAmount,
          paymentMethod: payload.paymentMethod,
          receivedAmount: payload.receivedAmount,
          changeAmount: payload.changeAmount,
          status: 'COMPLETED',
        },
      });

      // 3. Create Sale Items, Deduct Stock, Update Serials & Record Kardex Movements
      for (const item of payload.items) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            serialsUsed: item.serialsUsed ? (item.serialsUsed as any) : null,
          },
        });

        // Deduct Stock
        const updatedStock = await tx.stock.update({
          where: { productId_branchId: { productId: item.productId, branchId: payload.branchId } },
          data: { quantity: { decrement: item.quantity } },
        });

        const stockAfter = Number(updatedStock.quantity);
        const stockBefore = stockAfter + item.quantity;

        // Fetch product cost price for Kardex CPP valuation
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        const unitCost = prod ? Number(prod.costPrice) : item.unitPrice;

        // Create KardexMovement record stamped with branchId and reference to Sale
        await tx.kardexMovement.create({
          data: {
            productId: item.productId,
            branchId: payload.branchId,
            movementType: 'SALE',
            referenceId: sale.id,
            quantityChange: -item.quantity,
            stockBefore,
            stockAfter,
            unitCost,
          },
        });

        // Update Serial Status to SOLD
        if (item.serialsUsed && item.serialsUsed.length > 0) {
          for (const serialNum of item.serialsUsed) {
            await tx.productSerial.update({
              where: { serialNumber: serialNum },
              data: { status: 'SOLD' },
            });
          }
        }
      }

      // 4. Update CashRegister currentBalance if CASH or MIXED payment
      if (payload.paymentMethod === 'CASH' || payload.paymentMethod === 'MIXED') {
        /* Antes iba envuelto en un `catch` mudo «por si la caja es de
           mentira». Ahora la caja está verificada arriba, así que un fallo
           aquí significa que el saldo de la gaveta no se actualizó: dejarlo
           pasar es descuadrar el arqueo en silencio. */
        await tx.cashRegister.update({
          where: { id: payload.registerId },
          data: { currentBalance: { increment: payload.totalAmount } },
        });
      }

      return {
        success: true,
        status_code: 201,
        message: `Ticket #${sale.ticketNumber} procesado exitosamente.`,
        data: { sale_id: sale.id, ticket_number: sale.ticketNumber },
      };
    });
  }

  // 2. Void Sale Flow with Audit Logging
  async cancelSale(
    ticketId: string,
    adminUserId: string,
    reason: string,
    branchIdDelSolicitante?: string,
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('Debe proporcionar la justificación para anular la venta (mínimo 5 caracteres).');
    }

    return await this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: ticketId },
        include: { items: true },
      });

      if (!sale) {
        throw new NotFoundException(`La venta #${ticketId} no existe.`);
      }

      if (sale.status === 'CANCELLED') {
        throw new BadRequestException(`La venta #${ticketId} ya se encuentra anulada.`);
      }

      /* Anular devuelve mercancía al estante y descuadra una caja: se hace en
         la tienda donde ocurrió la venta. Sin esto, un supervisor de una
         sucursal anulaba ventas de otra, y el ajuste de existencias caía en un
         almacén que él no pisa. Es la misma regla que ya rige el cierre de
         turno, el cobro y el corte de caja. */
      if (branchIdDelSolicitante && sale.branchId !== branchIdDelSolicitante) {
        throw new ForbiddenException('Esa venta es de otra sucursal.');
      }

      // Mark status as CANCELLED
      await tx.sale.update({
        where: { id: ticketId },
        data: { status: 'CANCELLED', cancellationReason: reason },
      });

      // Revert stock, serials & log Kardex reversal
      for (const item of sale.items) {
        const updatedStock = await tx.stock.update({
          where: { productId_branchId: { productId: item.productId, branchId: sale.branchId } },
          data: { quantity: { increment: item.quantity } },
        });

        const stockAfter = Number(updatedStock.quantity);
        const stockBefore = stockAfter - Number(item.quantity);

        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        const unitCost = prod ? Number(prod.costPrice) : Number(item.unitPrice);

        await tx.kardexMovement.create({
          data: {
            productId: item.productId,
            branchId: sale.branchId,
            movementType: 'ADJUSTMENT',
            referenceId: `VOID-${sale.id}`,
            quantityChange: Number(item.quantity),
            stockBefore,
            stockAfter,
            unitCost,
          },
        });

        if (item.serialsUsed && Array.isArray(item.serialsUsed)) {
          for (const serialNum of item.serialsUsed as string[]) {
            await tx.productSerial.update({
              where: { serialNumber: serialNum },
              data: { status: 'IN_STOCK' },
            });
          }
        }
      }

      // Create Audit Log
      if (this.auditService) {
        /* Con el cliente de la transacción: una anulación sin rastro, o un
           rastro de una anulación que se deshizo, son las dos formas de que
           este registro no sirva para nada. */
        await this.auditService.log(
          {
            userId: adminUserId,
            branchId: sale.branchId,
            action: 'VOID_SALE',
            details: { saleId: ticketId, ticketNumber: sale.ticketNumber, reason },
          },
          tx,
        );
      }

      return {
        success: true,
        status_code: 200,
        message: `Venta #${ticketId} anulada exitosamente. Stock reincorporado.`,
        data: { sale_id: ticketId },
      };
    });
  }

  // 3. Z-Cut Report Generation for Cash Shift Closing
  async getZCutReport(
    shiftId: string,
    solicitante?: { id: string; role: string; branchId: string },
  ) {
    const shift = await this.prisma.cashShift.findUnique({
      where: { id: shiftId },
      include: { register: true, user: true, sales: true },
    });

    if (!shift) {
      throw new NotFoundException(`El turno de caja #${shiftId} no existe.`);
    }

    /* Un corte Z es el efectivo que debería haber en una gaveta concreta. Cada
       cual ve el suyo; el responsable de la sucursal, los de su sucursal. */
    if (solicitante) {
      const esSuyo = shift.userId === solicitante.id;
      const esResponsableDeLaSucursal =
        (solicitante.role === 'ADMIN' || solicitante.role === 'SUPERVISOR') &&
        shift.register.branchId === solicitante.branchId;

      if (!esSuyo && !esResponsableDeLaSucursal) {
        throw new ForbiddenException('Ese corte de caja no es suyo.');
      }
    }

    const totalCashSales = shift.sales
      .filter((s) => s.status === 'COMPLETED' && (s.paymentMethod === 'CASH' || s.paymentMethod === 'MIXED'))
      .reduce((acc, s) => acc + Number(s.totalAmount), 0);

    const totalCardSales = shift.sales
      .filter((s) => s.status === 'COMPLETED' && s.paymentMethod === 'CARD')
      .reduce((acc, s) => acc + Number(s.totalAmount), 0);

    const totalQrSales = shift.sales
      .filter((s) => s.status === 'COMPLETED' && s.paymentMethod === 'QR')
      .reduce((acc, s) => acc + Number(s.totalAmount), 0);

    const expectedCash = Number(shift.initialFloat) + totalCashSales;

    return {
      success: true,
      status_code: 200,
      data: {
        shiftId: shift.id,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        cashierName: shift.user.fullName,
        registerName: shift.register.name,
        initialFloat: Number(shift.initialFloat),
        totalCashSales,
        totalCardSales,
        totalQrSales,
        totalSalesCount: shift.sales.filter((s) => s.status === 'COMPLETED').length,
        expectedCash,
      },
    };
  }
}

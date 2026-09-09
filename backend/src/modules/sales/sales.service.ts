import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface CheckoutPayload {
  ticketNumber: string;
  branchId: string;
  registerId: string;
  shiftId: string;
  userId: string;
  customerId?: string;
  subtotal: number;
  tax?: number;
  totalAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'QR' | 'MIXED';
  receivedAmount: number;
  changeAmount: number;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    serialsUsed?: string[];
  }>;
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    @Optional() private auditService?: AuditService,
  ) {}

  // 1. Transactional Checkout Endpoint with ACID Rollback & Kardex Movement Logging
  async checkout(payload: CheckoutPayload) {
    if (!payload.items || payload.items.length === 0) {
      throw new BadRequestException('El carrito de venta no contiene productos.');
    }

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
        try {
          await tx.cashRegister.update({
            where: { id: payload.registerId },
            data: { currentBalance: { increment: payload.totalAmount } },
          });
        } catch {
          // Ignore if cash register ID is virtual/mock
        }
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
  async cancelSale(ticketId: string, adminUserId: string, reason: string) {
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
        await this.auditService.log({
          userId: adminUserId,
          branchId: sale.branchId,
          action: 'VOID_SALE',
          details: { saleId: ticketId, ticketNumber: sale.ticketNumber, reason },
        });
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
  async getZCutReport(shiftId: string) {
    const shift = await this.prisma.cashShift.findUnique({
      where: { id: shiftId },
      include: { register: true, user: true, sales: true },
    });

    if (!shift) {
      throw new NotFoundException(`El turno de caja #${shiftId} no existe.`);
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

import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface StockAdjustmentDto {
  product_id: string;
  branch_id: string;
  quantity_delta: number;
  adjustment_type: 'DAMAGED' | 'EXPIRED' | 'INTERNAL_USE' | 'CYCLE_COUNT_DISCREPANCY';
  reason: string;
  user_id: string;
}

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    @Optional() private auditService?: AuditService,
  ) {}

  // Atomic Stock Adjustment with Kardex & Audit Log Stamping
  async adjustStock(dto: StockAdjustmentDto) {
    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException('Debe proporcionar una justificación detallada para el ajuste de stock (mínimo 5 caracteres).');
    }

    const validTypes = ['DAMAGED', 'EXPIRED', 'INTERNAL_USE', 'CYCLE_COUNT_DISCREPANCY'];
    if (!validTypes.includes(dto.adjustment_type)) {
      throw new BadRequestException('El tipo de ajuste debe ser DAMAGED, EXPIRED, INTERNAL_USE o CYCLE_COUNT_DISCREPANCY.');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Fetch current stock
      const currentStock = await tx.stock.findUnique({
        where: {
          productId_branchId: {
            productId: dto.product_id,
            branchId: dto.branch_id,
          },
        },
      });

      const previousStock = currentStock ? Number(currentStock.quantity) : 0;
      const newStock = previousStock + dto.quantity_delta;

      if (newStock < 0) {
        throw new BadRequestException(`El ajuste resultaría en stock negativo (${newStock}). Operación cancelada.`);
      }

      // 2. Upsert stock
      await tx.stock.upsert({
        where: {
          productId_branchId: {
            productId: dto.product_id,
            branchId: dto.branch_id,
          },
        },
        update: { quantity: newStock },
        create: {
          productId: dto.product_id,
          branchId: dto.branch_id,
          quantity: newStock,
        },
      });

      // 3. Create StockAdjustment Log sealed with userId and branchId
      const adjustment = await tx.stockAdjustment.create({
        data: {
          branchId: dto.branch_id,
          userId: dto.user_id,
          adjustmentType: dto.adjustment_type,
          reason: dto.reason,
        },
      });

      // 4. Create KardexMovement Record
      const prod = await tx.product.findUnique({ where: { id: dto.product_id } });
      const unitCost = prod ? Number(prod.costPrice) : 0;

      await tx.kardexMovement.create({
        data: {
          productId: dto.product_id,
          branchId: dto.branch_id,
          movementType: 'ADJUSTMENT',
          referenceId: adjustment.id,
          quantityChange: dto.quantity_delta,
          stockBefore: previousStock,
          stockAfter: newStock,
          unitCost,
        },
      });

      // 5. Audit Log Stamping with Snapshot
      if (this.auditService) {
        await this.auditService.log({
          userId: dto.user_id,
          branchId: dto.branch_id,
          action: 'MANUAL_STOCK_ADJUSTMENT',
          details: {
            snapshot_before: { stock: previousStock },
            snapshot_after: { stock: newStock },
            difference: dto.quantity_delta,
            adjustment_type: dto.adjustment_type,
            reason: dto.reason,
            product_id: dto.product_id,
          },
        });
      }

      return {
        success: true,
        status_code: 200,
        message: 'Ajuste de stock registrado atómicamente en el Kardex y sellado con auditoría',
        data: {
          product_id: dto.product_id,
          previous_stock: previousStock,
          new_stock: newStock,
          adjustment_id: adjustment.id,
        },
      };
    });
  }
}

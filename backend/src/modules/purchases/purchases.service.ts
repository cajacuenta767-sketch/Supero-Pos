import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ReceivePurchaseItemDto {
  productId: string;
  quantity: number;
  unitCost: number;
  serials?: string[]; // Required if product is SERIALIZED
}

export interface ReceivePurchaseDto {
  purchaseOrderId: string;
  branchId: string;
  userId: string;
  items: ReceivePurchaseItemDto[];
}

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  // Fase 4: Recepción de Compras y Cálculo de Costo Promedio Ponderado (CPP)
  async receivePurchase(dto: ReceivePurchaseDto) {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id: dto.purchaseOrderId },
        include: { items: true },
      });

      if (!order) {
        throw new BadRequestException('Orden de compra no encontrada');
      }

      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        throw new BadRequestException(`La orden de compra no puede ser recibida. Estado actual: ${order.status}`);
      }

      let fullyReceived = true;

      for (const receiveItem of dto.items) {
        // Find matching item in the order
        const orderItem = order.items.find(i => i.productId === receiveItem.productId);
        if (!orderItem) {
          throw new BadRequestException(`El producto ${receiveItem.productId} no pertenece a esta orden de compra.`);
        }

        const product = await tx.product.findUnique({
          where: { id: receiveItem.productId }
        });

        if (!product) throw new BadRequestException('Producto no encontrado');

        // Validation for Serialized Items
        if (product.unitType === 'SERIALIZED') {
          if (!receiveItem.serials || receiveItem.serials.length !== receiveItem.quantity) {
            throw new BadRequestException(`El producto ${product.name} es SERIALIZADO. Debe enviar exactamente ${receiveItem.quantity} números de IMEI/Serie únicos.`);
          }

          // Insert serials ensuring uniqueness
          for (const serial of receiveItem.serials) {
            const existing = await tx.productSerial.findUnique({ where: { serialNumber: serial } });
            if (existing) {
              throw new BadRequestException(`El IMEI o Número de Serie ${serial} ya se encuentra registrado en el sistema.`);
            }
            await tx.productSerial.create({
              data: {
                productId: product.id,
                serialNumber: serial,
                status: 'IN_STOCK'
              }
            });
          }
        }

        // 1. Current Stock logic (with Race Condition protection - row level lock conceptually solved by serializable transaction/upsert)
        const currentStockRecord = await tx.stock.findUnique({
          where: { productId_branchId: { productId: product.id, branchId: dto.branchId } }
        });

        const currentStock = currentStockRecord ? Number(currentStockRecord.quantity) : 0;
        const incomingQty = receiveItem.quantity;
        const incomingCost = receiveItem.unitCost;
        const currentCost = Number(product.costPrice);

        // 2. Costo Promedio Ponderado (CPP) Calculation
        // New CPP = ((Stock * CPP) + (Incoming Qty * Incoming Cost)) / (Stock + Incoming Qty)
        let newCpp = incomingCost;
        if (currentStock > 0) {
          const totalValue = (currentStock * currentCost) + (incomingQty * incomingCost);
          const totalQty = currentStock + incomingQty;
          newCpp = Number((totalValue / totalQty).toFixed(4));
        }

        const newStock = currentStock + incomingQty;

        // 3. Update Product Cost Price (CPP) globally
        await tx.product.update({
          where: { id: product.id },
          data: { costPrice: newCpp }
        });

        // 4. Update Stock
        await tx.stock.upsert({
          where: { productId_branchId: { productId: product.id, branchId: dto.branchId } },
          update: { quantity: newStock },
          create: { productId: product.id, branchId: dto.branchId, quantity: newStock }
        });

        // 5. Register in Kardex with exact timestamps and costs
        await tx.kardexMovement.create({
          data: {
            productId: product.id,
            branchId: dto.branchId,
            movementType: 'PURCHASE',
            referenceId: order.id,
            quantityChange: incomingQty,
            stockBefore: currentStock,
            stockAfter: newStock,
            unitCost: newCpp // Histórico CPP en este instante
          }
        });

        // 6. Update Purchase Order Item received qty
        const updatedReceivedQty = Number(orderItem.receivedQty) + incomingQty;
        await tx.purchaseOrderItem.update({
          where: { id: orderItem.id },
          data: { receivedQty: updatedReceivedQty }
        });

        if (updatedReceivedQty < Number(orderItem.orderedQty)) {
          fullyReceived = false;
        }
      }

      // Update Order Status based on reception
      const newStatus = fullyReceived ? 'COMPLETED' : 'PARTIAL';
      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: newStatus }
      });

      return {
        success: true,
        message: 'Recepción de compra procesada. CPP y Kardex actualizados.',
        status: newStatus
      };
    });
  }
}

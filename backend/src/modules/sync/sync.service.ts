import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BlockAPayload {
  transaction_id: string; // UUID v4
  timestamp: string;
  branch_id: string;
  register_id: string;
  shift_id: string;
  cashier_id: string;
  customer_id?: string | null;
}

export interface BlockBPayload {
  subtotal: number;
  total_discount: number;
  grand_total: number;
}

export interface BlockCPaymentItem {
  payment_method: string;
  amount_received: number;
  change_given: number;
}

export interface BlockCPayload {
  payment_breakdown: BlockCPaymentItem[];
}

export interface BlockDPayloadItem {
  product_id: string;
  quantity: number; // Decimal support (e.g. 0.450)
  unit_price: number;
  line_subtotal: number;
  serials_used?: string[]; // IMEIs array
}

export interface BlockDPayload {
  items: BlockDPayloadItem[];
}

export interface TransactionPayload {
  // Flat properties
  transaction_id?: string;
  local_sale_id?: string;
  timestamp?: string;
  client_timestamp?: string;
  branch_id?: string;
  register_id?: string;
  shift_id?: string;
  cashier_id?: string;
  user_id?: string;
  customer_id?: string | null;
  subtotal?: number;
  total_discount?: number;
  discount?: number;
  grand_total?: number;
  total?: number;
  payment_method?: string;
  payment_breakdown?: BlockCPaymentItem[];
  items?: BlockDPayloadItem[];

  // Explicit 4-block structure
  block_a?: BlockAPayload;
  block_b?: BlockBPayload;
  block_c?: BlockCPayload;
  block_d?: BlockDPayload;
}

export interface BatchSyncPayload {
  terminal_id: string;
  sync_batch_id: string;
  transactions: TransactionPayload[];
}

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async processBatchSync(payload: BatchSyncPayload) {
    let processedCount = 0;
    let failedCount = 0;
    const errors: Array<{ transaction_id: string; error: string }> = [];

    for (const tx of payload.transactions || []) {
      // 1. Extraer Bloque A
      const transactionId =
        tx.transaction_id ||
        tx.block_a?.transaction_id ||
        tx.local_sale_id ||
        `TX-${Date.now()}`;

      const clientTimestamp =
        tx.timestamp ||
        tx.block_a?.timestamp ||
        tx.client_timestamp ||
        new Date().toISOString();

      const rawBranchId = tx.branch_id || tx.block_a?.branch_id || 'branch-01';
      const rawRegisterId = tx.register_id || tx.block_a?.register_id || 'caja-1';
      const rawShiftId = tx.shift_id || tx.block_a?.shift_id || 'shift-01';
      const rawCashierId = tx.cashier_id || tx.user_id || tx.block_a?.cashier_id || 'user-01';
      const rawCustomerId =
        tx.customer_id !== undefined
          ? tx.customer_id
          : tx.block_a?.customer_id ?? null;

      // 2. Extraer Bloque B
      const subtotal = tx.subtotal ?? tx.block_b?.subtotal ?? 0;
      const totalDiscount =
        tx.total_discount ?? tx.discount ?? tx.block_b?.total_discount ?? 0;
      const grandTotal = tx.grand_total ?? tx.total ?? tx.block_b?.grand_total ?? 0;

      // 3. Extraer Bloque C
      const paymentBreakdown: BlockCPaymentItem[] =
        tx.payment_breakdown ||
        tx.block_c?.payment_breakdown || [
          {
            payment_method: tx.payment_method || 'CASH',
            amount_received: grandTotal,
            change_given: 0,
          },
        ];

      const primaryPaymentMethod =
        paymentBreakdown[0]?.payment_method || tx.payment_method || 'CASH';
      const totalReceived = paymentBreakdown.reduce(
        (sum, p) => sum + (Number(p.amount_received) || 0),
        0
      );
      const totalChange = paymentBreakdown[0]?.change_given || 0;

      // 4. Extraer Bloque D
      const rawItems: BlockDPayloadItem[] = tx.items || tx.block_d?.items || [];

      try {
        // REGLA DE ORO: Idempotencia por UUID transaction_id
        const existingSale = await this.prisma.sale.findFirst({
          where: {
            OR: [
              { id: transactionId },
              { ticketNumber: transactionId },
              { ticketNumber: `OFFLINE-${transactionId.slice(0, 8)}` },
            ],
          },
        });

        if (existingSale) {
          console.log(
            `[IDEMPOTENCIA ACTIVADA] Transacción ${transactionId} ya procesada previamente en PostgreSQL. Respondiendo 200 OK.`
          );
          processedCount++;
          continue; // No se duplica Kardex ni saldo de caja
        }

        await this.prisma.$transaction(async (txPrisma) => {
          // Resolver / Garantizar existencias de Foreign Keys
          const keys = await this.resolveForeignKeys(
            txPrisma,
            rawBranchId,
            rawRegisterId,
            rawShiftId,
            rawCashierId,
            rawCustomerId
          );

          // Crear Venta Principal
          const ticketNumber = transactionId.startsWith('OFFLINE-')
            ? transactionId
            : `OFFLINE-${transactionId.slice(0, 8)}`;

          const isUuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              transactionId
            );

          const sale = await txPrisma.sale.create({
            data: {
              ...(isUuid ? { id: transactionId } : {}),
              ticketNumber,
              branchId: keys.branchId,
              registerId: keys.registerId,
              shiftId: keys.shiftId,
              userId: keys.userId,
              customerId: keys.customerId,
              subtotal,
              tax: 0,
              totalAmount: grandTotal,
              paymentMethod: (primaryPaymentMethod as any) || 'CASH',
              receivedAmount: totalReceived > 0 ? totalReceived : grandTotal,
              changeAmount: totalChange,
              status: 'COMPLETED',
              createdAt: new Date(clientTimestamp),
            },
          });

          // Procesar Bloque D (Items & Descuento de Kardex / Seriales)
          for (const item of rawItems) {
            const product = await this.ensureProduct(txPrisma, item.product_id);
            const serialsUsed = item.serials_used || [];

            // Actualizar estado de IMEIs / Seriales a SOLD
            for (const serialNum of serialsUsed) {
              const serialRecord = await txPrisma.productSerial.findUnique({
                where: { serialNumber: serialNum },
              });

              if (serialRecord) {
                await txPrisma.productSerial.update({
                  where: { id: serialRecord.id },
                  data: { status: 'SOLD' },
                });
              }
            }

            // Crear Detalle de Venta (soporte decimal en cantidad)
            await txPrisma.saleItem.create({
              data: {
                saleId: sale.id,
                productId: product.id,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                subtotal: item.line_subtotal || item.quantity * item.unit_price,
                serialsUsed: serialsUsed.length > 0 ? (serialsUsed as any) : null,
              },
            });

            // Descuento decimal de Stock en Inventario Central
            const stockRecord = await txPrisma.stock.findUnique({
              where: {
                productId_branchId: {
                  productId: product.id,
                  branchId: keys.branchId,
                },
              },
            });

            const currentQty = stockRecord ? Number(stockRecord.quantity) : 0;
            const newQty = currentQty - item.quantity;

            if (stockRecord) {
              await txPrisma.stock.update({
                where: { id: stockRecord.id },
                data: { quantity: newQty },
              });
            } else {
              await txPrisma.stock.create({
                data: {
                  productId: product.id,
                  branchId: keys.branchId,
                  quantity: newQty,
                },
              });
            }

            // Movimiento Kardex ACID
            await txPrisma.kardexMovement.create({
              data: {
                productId: product.id,
                branchId: keys.branchId,
                movementType: 'SALE',
                referenceId: sale.id,
                quantityChange: -item.quantity,
                stockBefore: currentQty,
                stockAfter: newQty,
                unitCost: item.unit_price,
              },
            });
          }
        });

        processedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({
          transaction_id: transactionId,
          error: err?.message || 'Transaction processing failed',
        });
      }
    }

    return {
      success: true,
      status_code: 200,
      processed_count: processedCount,
      failed_count: failedCount,
      errors,
    };
  }

  private async resolveForeignKeys(
    txPrisma: any,
    branchId: string,
    registerId: string,
    shiftId: string,
    userId: string,
    customerId?: string | null
  ) {
    // 1. Branch
    let branch = await txPrisma.branch.findFirst({ where: { id: branchId } });
    if (!branch) {
      branch = await txPrisma.branch.findFirst();
      if (!branch) {
        branch = await txPrisma.branch.create({
          data: {
            id: branchId,
            name: 'Sucursal Principal',
            address: 'Av. Central 123',
            phone: '70000000',
          },
        });
      }
    }

    // 2. Cash Register
    let register = await txPrisma.cashRegister.findFirst({
      where: { id: registerId },
    });
    if (!register) {
      register = await txPrisma.cashRegister.findFirst({
        where: { branchId: branch.id },
      });
      if (!register) {
        register = await txPrisma.cashRegister.create({
          data: {
            id: registerId,
            branchId: branch.id,
            name: 'Caja 1 Principal',
            currentBalance: 0,
          },
        });
      }
    }

    // 3. User Role & User
    let role = await txPrisma.role.findFirst({ where: { name: 'Admin' } });
    if (!role) {
      role = await txPrisma.role.create({
        data: { name: 'Admin', permissions: {} },
      });
    }

    let user = await txPrisma.user.findFirst({ where: { id: userId } });
    if (!user) {
      user = await txPrisma.user.findFirst({ where: { branchId: branch.id } });
      if (!user) {
        user = await txPrisma.user.create({
          data: {
            id: userId,
            username: 'cajero_pos',
            fullName: 'Cajero Operador POS',
            email: `cajero_${Date.now()}@superopos.com`,
            passwordHash: 'hash_placeholder',
            roleId: role.id,
            branchId: branch.id,
          },
        });
      }
    }

    // 4. Cash Shift
    let shift = await txPrisma.cashShift.findFirst({ where: { id: shiftId } });
    if (!shift) {
      shift = await txPrisma.cashShift.findFirst({
        where: { registerId: register.id, status: 'ACTIVE' },
      });
      if (!shift) {
        shift = await txPrisma.cashShift.create({
          data: {
            id: shiftId,
            registerId: register.id,
            userId: user.id,
            initialFloat: 100,
            expectedCash: 100,
            status: 'ACTIVE',
          },
        });
      }
    }

    // 5. Customer (optional)
    let validCustomerId: string | null = null;
    if (customerId) {
      const customerRecord = await txPrisma.customer.findFirst({
        where: { id: customerId },
      });
      if (customerRecord) {
        validCustomerId = customerRecord.id;
      }
    }

    return {
      branchId: branch.id,
      registerId: register.id,
      shiftId: shift.id,
      userId: user.id,
      customerId: validCustomerId,
    };
  }

  private async ensureProduct(txPrisma: any, productId: string) {
    let product = await txPrisma.product.findFirst({
      where: {
        OR: [{ id: productId }, { sku: productId }],
      },
    });

    if (!product) {
      // Create Fallback Category & Brand
      let category = await txPrisma.category.findFirst();
      if (!category) {
        category = await txPrisma.category.create({
          data: { name: 'General' },
        });
      }

      let brand = await txPrisma.brand.findFirst();
      if (!brand) {
        brand = await txPrisma.brand.create({
          data: { name: 'Genérica' },
        });
      }

      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          productId
        );

      product = await txPrisma.product.create({
        data: {
          ...(isUuid ? { id: productId } : {}),
          sku: `SKU-${productId.substring(0, 12)}`,
          name: `Producto Generico (${productId.substring(0, 8)})`,
          categoryId: category.id,
          brandId: brand.id,
          unitType: 'UNIT',
          costPrice: 10.0,
          retailPrice: 15.0,
          wholesalePrice: 12.0,
        },
      });
    }

    return product;
  }
}


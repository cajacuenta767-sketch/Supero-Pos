import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // High-performance POS Lookup (<200ms) by barcode, SKU, or name
  async posLookup(query: string, branchId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { barcode: { equals: query } },
          { sku: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        category: true,
        stocks: true,
      },
      take: 20,
    });

    return {
      success: true,
      status_code: 200,
      message: 'Consulta de productos realizada con éxito',
      data: products.map((p) => {
        const stockRecord = p.stocks.find(s => s.branchId === branchId);
        const stock = stockRecord?.quantity ? Number(stockRecord.quantity) : 0;
        return {
          id: p.id,
          sku: p.sku,
          barcode: p.barcode,
          name: p.name,
          cost_price: Number(p.costPrice),
          sale_price: Number(p.retailPrice),
          wholesale_price: p.wholesalePrice ? Number(p.wholesalePrice) : null,
          unit_type: p.unitType, // UNIT, FRACTION, SERIALIZED
          min_stock: Number(p.minStock),
          category: p.category.name,
          stock_available: stock,
        };
      }),
    };
  }

  /**
   * Catálogo vendible de una sucursal, con sus existencias.
   *
   * La terminal traía su propio catálogo y el servidor el suyo, y solo
   * coincidían porque la siembra los arrancaba de la misma lista. Un producto
   * dado de alta en la central no llegaba nunca a la caja, y una venta de un
   * producto que el servidor no conoce se rechaza al sincronizar y se queda en
   * la cola. Con esto la caja puede ponerse al día cuando hay red.
   */
  async catalogForBranch(branchId: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, brand: true, stocks: { where: { branchId } } },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      status_code: 200,
      data: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        barcode: p.barcode ?? '',
        name: p.name,
        category: p.category.name,
        brand: p.brand?.name ?? undefined,
        unit_type: p.unitType,
        cost_price: Number(p.costPrice),
        sale_price: Number(p.retailPrice),
        wholesale_price: Number(p.wholesalePrice),
        wholesale_min_qty: Number(p.wholesaleMinQty),
        min_stock: Number(p.minStock),
        /* Existencias de esta sucursal. Sin fila de stock son cero: el producto
           existe en el catálogo pero no hay nada en esta tienda. */
        stock: p.stocks[0] ? Number(p.stocks[0].quantity) : 0,
      })),
    };
  }

  // Verify IMEI / Serial code status for serialized items
  async verifySerial(serialNumber: string) {
    const serial = await this.prisma.productSerial.findUnique({
      where: { serialNumber: serialNumber },
      include: { product: true },
    });

    if (!serial) {
      throw new NotFoundException(`El número de serie / IMEI '${serialNumber}' no existe en el catálogo.`);
    }

    if (serial.status !== 'IN_STOCK') {
      throw new BadRequestException(`El número de serie '${serialNumber}' ya fue vendido o está en estado '${serial.status}'.`);
    }

    return {
      success: true,
      status_code: 200,
      message: 'Número de serie verificado y disponible para venta',
      data: {
        id: serial.id,
        serial_number: serial.serialNumber,
        status: serial.status,
        product: {
          id: serial.product.id,
          sku: serial.product.sku,
          name: serial.product.name,
          sale_price: Number(serial.product.retailPrice),
        },
      },
    };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // High-performance POS Lookup (<200ms) by barcode, SKU, or name
  async posLookup(query: string, branchId = 'default-branch') {
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

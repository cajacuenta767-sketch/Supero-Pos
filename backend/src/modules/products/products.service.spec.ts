import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProductsService (Sprint 1 QA - Unit Types & POS Lookup)', () => {
  let service: ProductsService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'prod-1',
          sku: 'AB-QSO-001',
          barcode: '775000111222',
          name: 'Queso Criollo a granel',
          costPrice: 30.0,
          retailPrice: 45.0,
          wholesalePrice: 40.0,
          unitType: 'FRACTION',
          minStock: 5,
          category: { name: 'Abarrotes' },
          stocks: [{ branchId: 'default-branch', quantity: 12.45 }],
        },
      ]),
    },
    productSerial: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should format decimal fractional stock and prices correctly in posLookup', async () => {
    const result = await service.posLookup('Queso', 'default-branch');
    expect(result.success).toBe(true);
    expect(result.data[0].unit_type).toBe('FRACTION');
    expect(result.data[0].stock_available).toBe(12.45);
    expect(result.data[0].wholesale_price).toBe(40.0);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InventoryService (Sprint 3 QA - Kardex & Audit Log)', () => {
  let service: InventoryService;

  const mockPrismaService = {
    $transaction: jest.fn().mockImplementation((callback) =>
      callback({
        stock: {
          findUnique: jest.fn().mockResolvedValue({ quantity: 10.0 }),
          upsert: jest.fn().mockResolvedValue({ quantity: 15.0 }),
        },
        stockAdjustment: {
          create: jest.fn().mockResolvedValue({ id: 'adj-99' }),
        },
      })
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should process atomic stock adjustment and generate log', async () => {
    const result = await service.adjustStock({
      product_id: 'prod-1',
      branch_id: 'branch-1',
      quantity_delta: 5,
      adjustment_type: 'CYCLE_COUNT_DISCREPANCY',
      reason: 'Conteo físico',
      user_id: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.data.previous_stock).toBe(10.0);
    expect(result.data.new_stock).toBe(15.0);
    expect(result.data.adjustment_id).toBe('adj-99');
  });
});

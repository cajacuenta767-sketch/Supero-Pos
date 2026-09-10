import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { BatchSyncDto } from './dto/batch-sync.dto';

/**
 * El servidor no puede volver a tarifar —la terminal fija el precio sin
 * conexión— pero sí exigir que las cuentas cierren. Antes guardaba el
 * `subtotal` y el `grand_total` que llegaran: una venta cuya cabecera dijera
 * 5 Bs y cuyas líneas sumaran 500 entraba en los libros sin que nada la mirara.
 */
describe('SyncService · importes que cuadran', () => {
  let service: SyncService;

  const prisma = {
    sale: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
  };

  const venta = (parches: Record<string, unknown> = {}): BatchSyncDto => ({
    terminal_id: 'caja-1',
    sync_batch_id: 'lote-1',
    transactions: [
      {
        transaction_id: '11111111-1111-4111-8111-111111111111',
        timestamp: '2026-09-10T10:00:00.000Z',
        branch_id: 'sucursal-1',
        register_id: 'caja-1',
        shift_id: 'turno-1',
        cashier_id: 'usuario-1',
        customer_id: null,
        subtotal: 100,
        total_discount: 10,
        grand_total: 90,
        payment_breakdown: [{ payment_method: 'CASH', amount_received: 100, change_given: 10 }],
        items: [
          { product_id: '107', quantity: 2, unit_price: 25, line_subtotal: 50 },
          { product_id: '106', quantity: 1, unit_price: 50, line_subtotal: 50 },
        ],
        ...parches,
      },
    ],
  }) as BatchSyncDto;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.sale.findUnique.mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyncService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(SyncService);
  });

  /** El resultado sin llegar a tocar la base: basta con ver si se rechaza. */
  const motivo = async (dto: BatchSyncDto) => {
    const r = await service.processBatchSync(dto);
    return r.errors[0]?.error ?? null;
  };

  it('rechaza una venta cuyas líneas no suman el subtotal', async () => {
    const error = await motivo(venta({ subtotal: 5, total_discount: 0, grand_total: 5 }));
    expect(error).toMatch(/líneas suman 100.00 y el subtotal declarado es 5.00/);
  });

  it('rechaza un total que no es el subtotal menos el descuento', async () => {
    const error = await motivo(venta({ grand_total: 5 }));
    expect(error).toMatch(/no es el subtotal menos el descuento/);
  });

  it('rechaza una venta que no se cobró entera', async () => {
    const error = await motivo(
      venta({ payment_breakdown: [{ payment_method: 'CASH', amount_received: 10, change_given: 0 }] }),
    );
    expect(error).toMatch(/no cubre el total/);
  });

  it('la venta rechazada no se confirma: se queda en la cola de la terminal', async () => {
    const r = await service.processBatchSync(venta({ grand_total: 5 }));
    expect(r.processed_ids).toEqual([]);
    expect(r.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deja pasar el redondeo de los céntimos, que no es un descuadre', async () => {
    /* 3,22 kg a 45,00 son 144,90 exactos, pero el cliente puede mandar 144,8999
       tras redondear a cuatro decimales. */
    const error = await motivo(
      venta({
        subtotal: 144.9,
        total_discount: 0,
        grand_total: 144.9,
        items: [{ product_id: '102', quantity: 3.22, unit_price: 45, line_subtotal: 144.8999 }],
        payment_breakdown: [{ payment_method: 'QR', amount_received: 144.9, change_given: 0 }],
      }),
    );
    expect(error).not.toMatch(/líneas suman/);
  });
});

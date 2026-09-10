import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * El registro de auditoría existe para que ninguna operación sensible pase sin
 * rastro. Antes se tragaba sus propios fallos: con la escritura caída, una
 * merma de cinco unidades se aplicó y la API respondió «sellado con
 * auditoría». Verificado contra la base real.
 */
describe('AuditService', () => {
  let service: AuditService;
  let prisma: Record<string, any>;

  const sello = {
    userId: 'u-1',
    branchId: 'b-1',
    action: 'MANUAL_STOCK_ADJUSTMENT',
    details: { difference: -5 },
  };

  beforeEach(async () => {
    prisma = { auditLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AuditService);
  });

  it('escribe el sello', async () => {
    await expect(service.log(sello)).resolves.toMatchObject({ id: 'log-1' });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('usa el cliente de la transacción cuando se le pasa uno', async () => {
    const tx = { auditLog: { create: jest.fn().mockResolvedValue({ id: 'log-tx' }) } };
    await service.log(sello, tx as never);

    /* Si escribiera por su propia conexión, el sello sobreviviría a una
       transacción deshecha y describiría algo que nunca ocurrió. */
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('no se traga un fallo de escritura', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('constraint violation'));
    await expect(service.log(sello)).rejects.toThrow(ServiceUnavailableException);
  });
});

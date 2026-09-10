import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * El turno es la unidad contable de la jornada: su fondo, su conteo y su
 * descuadre quedan a nombre de alguien. Antes el controlador aceptaba el
 * `userId` del cuerpo de la petición y el cierre no comprobaba de quién era el
 * turno, así que un cajero podía abrir uno a nombre de un compañero y cerrar
 * el de cualquiera con solo conocer su identificador.
 */
describe('CashRegistersService · a quién se atribuye un turno', () => {
  let service: CashRegistersService;

  /* `$transaction` ejecuta el callback con el propio mock: el turno y su sello
     de auditoría se escriben juntos o no se escribe ninguno. */
  const prisma: Record<string, any> = {
    cashRegister: { findUnique: jest.fn() },
    cashShift: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const audit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashRegistersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(CashRegistersService);
  });

  describe('openShift', () => {
    beforeEach(() => {
      prisma.cashShift.findFirst.mockResolvedValue(null);
      prisma.cashShift.create.mockResolvedValue({ id: 'turno-1', initialFloat: 300 });
    });

    it('abre en una caja de la propia sucursal', async () => {
      prisma.cashRegister.findUnique.mockResolvedValue({ id: 'caja-1', branchId: 'sucursal-a' });

      await service.openShift({
        registerId: 'caja-1',
        userId: 'usuario-1',
        branchId: 'sucursal-a',
        initialFloat: 300,
      });

      expect(prisma.cashShift.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'usuario-1' }) }),
      );
    });

    it('rechaza una caja de otra sucursal', async () => {
      prisma.cashRegister.findUnique.mockResolvedValue({ id: 'caja-9', branchId: 'sucursal-b' });

      await expect(
        service.openShift({
          registerId: 'caja-9',
          userId: 'usuario-1',
          branchId: 'sucursal-a',
          initialFloat: 300,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.cashShift.create).not.toHaveBeenCalled();
    });

    it('rechaza una caja que no existe', async () => {
      prisma.cashRegister.findUnique.mockResolvedValue(null);

      await expect(
        service.openShift({
          registerId: 'inventada',
          userId: 'usuario-1',
          branchId: 'sucursal-a',
          initialFloat: 300,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('closeShift', () => {
    const turnoAjeno = {
      id: 'turno-2',
      userId: 'otro-empleado',
      status: 'ACTIVE',
      initialFloat: 200,
      sales: [],
      register: { branchId: 'sucursal-a' },
    };

    beforeEach(() => {
      prisma.cashShift.update.mockResolvedValue({ id: 'turno-2', difference: 0 });
    });

    it('lo cierra quien lo abrió', async () => {
      prisma.cashShift.findUnique.mockResolvedValue({ ...turnoAjeno, userId: 'usuario-1' });

      await expect(
        service.closeShift({
          shiftId: 'turno-2',
          userId: 'usuario-1',
          branchId: 'sucursal-a',
          role: 'CAJERO',
          countedCash: 200,
        }),
      ).resolves.toBeDefined();
    });

    it('un cajero no cierra el turno de otro', async () => {
      prisma.cashShift.findUnique.mockResolvedValue(turnoAjeno);

      await expect(
        service.closeShift({
          shiftId: 'turno-2',
          userId: 'usuario-1',
          branchId: 'sucursal-a',
          role: 'CAJERO',
          countedCash: 0,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.cashShift.update).not.toHaveBeenCalled();
    });

    it('un supervisor sí puede cerrar el de su sucursal: alguien tiene que poder', async () => {
      prisma.cashShift.findUnique.mockResolvedValue(turnoAjeno);

      await expect(
        service.closeShift({
          shiftId: 'turno-2',
          userId: 'supervisor-1',
          branchId: 'sucursal-a',
          role: 'SUPERVISOR',
          countedCash: 200,
        }),
      ).resolves.toBeDefined();
    });

    it('ni un supervisor cierra el turno de otra sucursal', async () => {
      prisma.cashShift.findUnique.mockResolvedValue(turnoAjeno);

      await expect(
        service.closeShift({
          shiftId: 'turno-2',
          userId: 'supervisor-1',
          branchId: 'sucursal-b',
          role: 'SUPERVISOR',
          countedCash: 0,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

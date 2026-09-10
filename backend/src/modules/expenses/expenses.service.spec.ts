import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

/**
 * Un gasto saca dinero del negocio. El de caja chica se comparaba contra la
 * cadena '1234' escrita en el propio código del servidor, junto a un comentario
 * que decía «en un caso real, validar aquí el PIN»: cualquiera con sesión
 * retiraba efectivo mandando ese número.
 */
describe('ExpensesService · retiros de caja chica', () => {
  let service: ExpensesService;

  const prisma = { expense: { create: jest.fn() } };
  const auth = { authorizeWithPin: jest.fn() };

  const gasto = (parches: Record<string, unknown> = {}) => ({
    branchId: 'sucursal-1',
    userId: 'usuario-1',
    terminalId: 'caja-1',
    category: 'Suministros',
    amount: 50,
    paymentSource: 'PETTY_CASH' as const,
    referenceNumber: 'REC-1',
    description: 'Compra de bolsas',
    supervisorPin: '607784',
    ...parches,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.expense.create.mockResolvedValue({ id: 'gasto-1' });
    auth.authorizeWithPin.mockResolvedValue({ authorizedBy: { id: 'sup-1', name: 'María López' } });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: auth },
      ],
    }).compile();
    service = module.get(ExpensesService);
  });

  it('el PIN lo comprueba el módulo de autenticación, no una cadena de este fichero', async () => {
    await service.createExpense(gasto());
    expect(auth.authorizeWithPin).toHaveBeenCalledWith('607784', 'caja-1', 'petty_cash_expense');
  });

  it('un PIN que el servidor rechaza detiene el gasto', async () => {
    auth.authorizeWithPin.mockRejectedValue(new UnauthorizedException('PIN incorrecto.'));
    await expect(service.createExpense(gasto({ supervisorPin: '1234' }))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it('sin PIN no se retira de caja chica', async () => {
    await expect(service.createExpense(gasto({ supervisorPin: undefined }))).rejects.toThrow(
      BadRequestException,
    );
    expect(auth.authorizeWithPin).not.toHaveBeenCalled();
  });

  it('sin comprobante tampoco: el retiro tiene que tener respaldo físico', async () => {
    await expect(service.createExpense(gasto({ referenceNumber: undefined }))).rejects.toThrow(
      /comprobante/i,
    );
  });

  it('el gasto queda con su responsable y con quién lo autorizó', async () => {
    await service.createExpense(gasto());
    expect(prisma.expense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'usuario-1',
        description: 'Compra de bolsas · autorizado por María López',
      }),
    });
  });

  it('un gasto por banco no pide PIN: no sale efectivo de la gaveta', async () => {
    await service.createExpense(gasto({ paymentSource: 'BANK_ACCOUNT', supervisorPin: undefined }));
    expect(auth.authorizeWithPin).not.toHaveBeenCalled();
    expect(prisma.expense.create).toHaveBeenCalled();
  });
});

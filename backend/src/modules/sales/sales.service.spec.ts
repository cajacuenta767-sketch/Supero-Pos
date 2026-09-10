import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutPayload } from './dto/checkout.dto';

/**
 * `POST /sales/checkout` no lo llama nadie desde la terminal —la venta viaja
 * por la cola de sincronización— pero está montado y abierto a cualquier
 * cajero. Estas pruebas fijan lo que se comprobó a mano contra la API real:
 * el precio lo pone el catálogo, el turno tiene que ser suyo, y la venta tiene
 * que cuadrar consigo misma.
 */
describe('SalesService · checkout', () => {
  let service: SalesService;
  let prisma: Record<string, any>;

  const CAJERO = { userId: 'u-cajero', branchId: 'b-central', role: 'CAJERO' };
  const turno = {
    id: 'turno-1',
    status: 'ACTIVE',
    userId: 'u-cajero',
    registerId: 'caja-1',
    register: { id: 'caja-1', branchId: 'b-central', name: 'Caja 1' },
  };
  const producto = {
    name: 'Audífonos',
    retailPrice: 35,
    wholesalePrice: 30,
    wholesaleMinQty: 12,
  };

  const venta = (extra: Partial<CheckoutPayload> = {}): CheckoutPayload => ({
    ...CAJERO,
    ticketNumber: 'T-1',
    registerId: 'caja-1',
    shiftId: 'turno-1',
    subtotal: 105,
    totalAmount: 105,
    paymentMethod: 'CASH' as const,
    receivedAmount: 105,
    changeAmount: 0,
    items: [{ productId: 'p-103', quantity: 3, unitPrice: 35, subtotal: 105 }],
    ...extra,
  });

  beforeEach(async () => {
    prisma = {
      cashShift: { findUnique: jest.fn().mockResolvedValue(turno) },
      product: { findUnique: jest.fn().mockResolvedValue(producto) },
      $transaction: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SalesService);
  });

  it('deja pasar una venta al precio de catálogo', async () => {
    await expect(service.checkout(venta())).resolves.toBeDefined();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rechaza cobrar por debajo del precio de catálogo', async () => {
    const regalada = venta({
      subtotal: 0.01,
      totalAmount: 0.01,
      receivedAmount: 0.01,
      items: [{ productId: 'p-103', quantity: 3, unitPrice: 0.0033, subtotal: 0.01 }],
    });
    await expect(service.checkout(regalada)).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('acepta el precio mayorista cuando la cantidad llega al mínimo', async () => {
    const mayorista = venta({
      subtotal: 360,
      totalAmount: 360,
      receivedAmount: 360,
      items: [{ productId: 'p-103', quantity: 12, unitPrice: 30, subtotal: 360 }],
    });
    await expect(service.checkout(mayorista)).resolves.toBeDefined();
  });

  it('rechaza el precio mayorista sin llegar al mínimo', async () => {
    const trampa = venta({
      subtotal: 90,
      totalAmount: 90,
      receivedAmount: 90,
      items: [{ productId: 'p-103', quantity: 3, unitPrice: 30, subtotal: 90 }],
    });
    await expect(service.checkout(trampa)).rejects.toThrow(BadRequestException);
  });

  it('rechaza un total que no es la suma de las líneas', async () => {
    await expect(
      service.checkout(venta({ totalAmount: 1, receivedAmount: 1 })),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza lo cobrado por debajo del total', async () => {
    await expect(
      service.checkout(venta({ receivedAmount: 10 })),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza vender en el turno de otro', async () => {
    prisma.cashShift.findUnique.mockResolvedValue({ ...turno, userId: 'u-otro' });
    await expect(service.checkout(venta())).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('permite al supervisor vender en el turno de su sucursal', async () => {
    prisma.cashShift.findUnique.mockResolvedValue({ ...turno, userId: 'u-otro' });
    await expect(
      service.checkout(venta({ role: 'SUPERVISOR' })),
    ).resolves.toBeDefined();
  });

  it('rechaza un turno ya cerrado', async () => {
    prisma.cashShift.findUnique.mockResolvedValue({ ...turno, status: 'CLOSED' });
    await expect(service.checkout(venta())).rejects.toThrow(BadRequestException);
  });

  it('rechaza una caja que no es la del turno', async () => {
    await expect(
      service.checkout(venta({ registerId: 'caja-9' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza una caja de otra sucursal', async () => {
    prisma.cashShift.findUnique.mockResolvedValue({
      ...turno,
      register: { ...turno.register, branchId: 'b-otra' },
    });
    await expect(service.checkout(venta())).rejects.toThrow(ForbiddenException);
  });
});

describe('SalesService · corte Z', () => {
  let service: SalesService;
  let prisma: Record<string, any>;

  const turno = {
    id: 'turno-1',
    userId: 'u-cajero',
    openedAt: new Date(),
    closedAt: null,
    initialFloat: 100,
    sales: [],
    user: { fullName: 'Ana Quispe' },
    register: { name: 'Caja 1', branchId: 'b-central' },
  };

  beforeEach(async () => {
    prisma = { cashShift: { findUnique: jest.fn().mockResolvedValue(turno) } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(SalesService);
  });

  it('cada cual ve el suyo', async () => {
    await expect(
      service.getZCutReport('turno-1', { id: 'u-cajero', role: 'CAJERO', branchId: 'b-central' }),
    ).resolves.toMatchObject({ success: true });
  });

  it('un cajero no ve el corte de otro', async () => {
    await expect(
      service.getZCutReport('turno-1', { id: 'u-otro', role: 'CAJERO', branchId: 'b-central' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('el supervisor ve los de su sucursal', async () => {
    await expect(
      service.getZCutReport('turno-1', { id: 'u-jefe', role: 'SUPERVISOR', branchId: 'b-central' }),
    ).resolves.toMatchObject({ success: true });
  });

  it('pero no los de otra sucursal', async () => {
    await expect(
      service.getZCutReport('turno-1', { id: 'u-jefe', role: 'SUPERVISOR', branchId: 'b-otra' }),
    ).rejects.toThrow(ForbiddenException);
  });
});

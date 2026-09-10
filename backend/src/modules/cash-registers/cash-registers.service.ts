import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface OpenShiftDto {
  registerId: string;
  userId: string;
  branchId: string;
  initialFloat: number;
}

export interface CloseShiftDto {
  shiftId: string;
  userId: string;
  branchId: string;
  countedCash: number;
  notes?: string;
}

@Injectable()
export class CashRegistersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Cajas físicas de una sucursal.
   *
   * La terminal necesita el identificador real de su caja para abrir turno y
   * para que sus ventas se puedan atribuir. No había forma de consultarlo, así
   * que la terminal se inventaba un `caja-1` que el servidor no reconocía y
   * rechazaba cada venta al sincronizar.
   */
  async listByBranch(branchId: string) {
    const registers = await this.prisma.cashRegister.findMany({
      where: { branchId },
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    });

    return { success: true, status_code: 200, data: registers };
  }

  async openShift(dto: OpenShiftDto) {
    // Check if user already has an active shift on this register
    const activeShift = await this.prisma.cashShift.findFirst({
      where: { registerId: dto.registerId, userId: dto.userId, status: 'ACTIVE' },
    });

    if (activeShift) {
      throw new BadRequestException('El usuario ya cuenta con un turno de caja activo en esta caja.');
    }

    const shift = await this.prisma.cashShift.create({
      data: {
        registerId: dto.registerId,
        userId: dto.userId,
        initialFloat: dto.initialFloat,
        expectedCash: dto.initialFloat,
        status: 'ACTIVE',
      },
    });

    // Create Audit Log
    await this.auditService.log({
      userId: dto.userId,
      branchId: dto.branchId,
      action: 'CASH_SHIFT_OPEN',
      details: { shiftId: shift.id, registerId: dto.registerId, initialFloat: dto.initialFloat },
    });

    return {
      success: true,
      status_code: 201,
      message: 'Turno de caja abierto exitosamente.',
      data: shift,
    };
  }

  async closeShift(dto: CloseShiftDto) {
    const shift = await this.prisma.cashShift.findUnique({
      where: { id: dto.shiftId },
      include: { sales: true },
    });

    if (!shift || shift.status === 'CLOSED') {
      throw new NotFoundException('El turno de caja no existe o ya fue cerrado.');
    }

    const cashSalesTotal = shift.sales
      .filter((s) => s.status === 'COMPLETED' && (s.paymentMethod === 'CASH' || s.paymentMethod === 'MIXED'))
      .reduce((sum, s) => sum + Number(s.totalAmount), 0);

    const expectedCash = Number(shift.initialFloat) + cashSalesTotal;
    const difference = dto.countedCash - expectedCash;

    const updatedShift = await this.prisma.cashShift.update({
      where: { id: dto.shiftId },
      data: {
        closedAt: new Date(),
        expectedCash,
        countedCash: dto.countedCash,
        difference,
        status: 'CLOSED',
      },
    });

    // Create Audit Log
    await this.auditService.log({
      userId: dto.userId,
      branchId: dto.branchId,
      action: 'CASH_SHIFT_CLOSE',
      details: {
        shiftId: shift.id,
        expectedCash,
        countedCash: dto.countedCash,
        difference,
        notes: dto.notes,
      },
    });

    return {
      success: true,
      status_code: 200,
      message: 'Turno de caja cerrado y arqueado exitosamente.',
      data: updatedShift,
    };
  }

  async getActiveShift(userId: string, registerId: string) {
    const shift = await this.prisma.cashShift.findFirst({
      where: { userId, registerId, status: 'ACTIVE' },
    });

    return {
      success: true,
      status_code: 200,
      data: shift,
    };
  }
}

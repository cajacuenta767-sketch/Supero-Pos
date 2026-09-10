import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/* Lo que el servicio necesita para abrir o cerrar. La identidad la pone el
   controlador desde la sesión; el contrato de entrada —lo que puede mandar el
   cliente— vive en `dto/shift.dto.ts` y ya no incluye a quién atribuirlo. */
export interface OpenShiftInput {
  registerId: string;
  userId: string;
  branchId: string;
  initialFloat: number;
}

export interface CloseShiftInput {
  shiftId: string;
  userId: string;
  branchId: string;
  role: string;
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

  async openShift(dto: OpenShiftInput) {
    /* La caja tiene que ser de la sucursal de quien abre: sin esto, un cajero
       abría turno en una caja de otra tienda con solo saber su identificador,
       que además le entrega la propia lista de cajas. */
    const register = await this.prisma.cashRegister.findUnique({
      where: { id: dto.registerId },
      select: { id: true, branchId: true },
    });

    if (!register || register.branchId !== dto.branchId) {
      throw new NotFoundException('La caja no existe en esta sucursal.');
    }

    // Check if user already has an active shift on this register
    const activeShift = await this.prisma.cashShift.findFirst({
      where: { registerId: dto.registerId, userId: dto.userId, status: 'ACTIVE' },
    });

    if (activeShift) {
      throw new BadRequestException('El usuario ya cuenta con un turno de caja activo en esta caja.');
    }

    /* El turno y su sello, o ninguno de los dos. Cuando el sello se escribía
       aparte, un fallo suyo dejaba el turno abierto y devolvía error: quien
       reintentaba se topaba con «ya cuenta con un turno activo» y no podía ni
       abrir ni cerrar. */
    const shift = await this.prisma.$transaction(async (tx) => {
      const creado = await tx.cashShift.create({
        data: {
          registerId: dto.registerId,
          userId: dto.userId,
          initialFloat: dto.initialFloat,
          expectedCash: dto.initialFloat,
          status: 'ACTIVE',
        },
      });

      await this.auditService.log(
        {
          userId: dto.userId,
          branchId: dto.branchId,
          action: 'CASH_SHIFT_OPEN',
          details: {
            shiftId: creado.id,
            registerId: dto.registerId,
            initialFloat: dto.initialFloat,
          },
        },
        tx,
      );

      return creado;
    });

    return {
      success: true,
      status_code: 201,
      message: 'Turno de caja abierto exitosamente.',
      data: shift,
    };
  }

  async closeShift(dto: CloseShiftInput) {
    const shift = await this.prisma.cashShift.findUnique({
      where: { id: dto.shiftId },
      include: { sales: true, register: { select: { branchId: true } } },
    });

    if (!shift || shift.status === 'CLOSED') {
      throw new NotFoundException('El turno de caja no existe o ya fue cerrado.');
    }

    /* Un turno lo cierra quien lo abrió, o un responsable de esa misma
       sucursal. Antes bastaba con conocer el identificador del turno: no se
       comprobaba de quién era ni de qué tienda. */
    const esSuyo = shift.userId === dto.userId;
    const esResponsableDeLaSucursal =
      (dto.role === 'ADMIN' || dto.role === 'SUPERVISOR') &&
      shift.register?.branchId === dto.branchId;

    if (!esSuyo && !esResponsableDeLaSucursal) {
      throw new ForbiddenException('Este turno de caja no es suyo.');
    }

    const cashSalesTotal = shift.sales
      .filter((s) => s.status === 'COMPLETED' && (s.paymentMethod === 'CASH' || s.paymentMethod === 'MIXED'))
      .reduce((sum, s) => sum + Number(s.totalAmount), 0);

    const expectedCash = Number(shift.initialFloat) + cashSalesTotal;
    const difference = dto.countedCash - expectedCash;

    /* El arqueo y su sello van juntos: un cierre sin constancia del descuadre
       es exactamente el registro que hace falta cuando falta dinero. */
    const updatedShift = await this.prisma.$transaction(async (tx) => {
      const cerrado = await tx.cashShift.update({
        where: { id: dto.shiftId },
        data: {
          closedAt: new Date(),
          expectedCash,
          countedCash: dto.countedCash,
          difference,
          status: 'CLOSED',
        },
      });

      await this.auditService.log(
        {
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
        },
        tx,
      );

      return cerrado;
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

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogDto {
  userId: string;
  branchId?: string;
  action: string;
  details: Record<string, any>;
}

/**
 * Cliente de base de datos con el que escribir el sello.
 *
 * Es opcional para que quien registra dentro de una transacción pase el suyo:
 * el sello se guarda o se pierde junto con la operación que describe, no por
 * separado.
 */
type ClienteAuditable = Pick<PrismaService, 'auditLog'> | Prisma.TransactionClient;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Deja constancia de una operación sensible.
   *
   * Antes hacía dos cosas mal, y las dos se comprobaron contra la base real:
   *
   * 1. Escribía siempre por `this.prisma`, aunque quien llamaba estuviera
   *    dentro de una transacción. Como es otra conexión, el sello no formaba
   *    parte de la operación: si la transacción se deshacía, quedaba un
   *    registro de auditoría apuntando a un ajuste que nunca existió.
   *
   * 2. Se tragaba cualquier fallo con un `console.warn` y devolvía `null`. Con
   *    la escritura de auditoría caída, una merma de cinco unidades se aplicó
   *    al stock y la API respondió «registrado atómicamente en el Kardex y
   *    sellado con auditoría» sin que quedara ni una línea de rastro. Una baja
   *    de inventario invisible es exactamente lo que el registro existe para
   *    impedir.
   *
   * Ahora el fallo sube. Es una inserción sencilla contra la misma base que la
   * operación acaba de usar: si esto no se puede escribir, la operación no
   * debería darse por buena.
   */
  async log(dto: CreateAuditLogDto, cliente?: ClienteAuditable) {
    const db = cliente ?? this.prisma;
    try {
      return await db.auditLog.create({
        data: {
          userId: dto.userId,
          branchId: dto.branchId || null,
          action: dto.action,
          details: dto.details,
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo sellar la auditoría de '${dto.action}' (usuario ${dto.userId}).`,
        error instanceof Error ? error.stack : String(error),
      );
      /* El detalle técnico queda en el registro del servidor; a quien está en
         el mostrador se le dice qué ha pasado con su operación, que es lo que
         necesita saber. Un 500 pelado no dice si se aplicó o no. */
      throw new ServiceUnavailableException({
        success: false,
        status_code: 503,
        message:
          'No se pudo dejar constancia de la operación, así que se ha deshecho por completo. ' +
          'Vuelva a intentarlo; si persiste, avise al responsable del sistema.',
      });
    }
  }

  async getLogs(branchId?: string, limit = 100) {
    return await this.prisma.auditLog.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogDto {
  userId: string;
  branchId?: string;
  action: string;
  details: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: dto.userId,
          branchId: dto.branchId || null,
          action: dto.action,
          details: dto.details,
        },
      });
    } catch (error) {
      console.warn('Failed to persist audit log:', error);
      return null;
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

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateExpenseDto {
  branchId: string;
  category: string;
  amount: number;
  paymentSource: 'PETTY_CASH' | 'BANK_ACCOUNT';
  referenceNumber?: string;
  description: string;
  supervisorPin?: string; // For PETTY_CASH authorization
}

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  // Fase 4.4: Registro de Salidas de Efectivo Menores (Caja Chica)
  async createExpense(dto: CreateExpenseDto) {
    if (dto.paymentSource === 'PETTY_CASH') {
      if (!dto.supervisorPin) {
        throw new BadRequestException('Se requiere PIN de supervisor para retiros de Caja Chica.');
      }
      
      // In a real scenario, validate supervisor PIN here
      if (dto.supervisorPin !== '1234') {
        throw new BadRequestException('PIN de autorización inválido.');
      }

      if (!dto.referenceNumber) {
        throw new BadRequestException('Captura obligatoria del número de comprobante o recibo físico respaldatorio.');
      }
    }

    const expense = await this.prisma.expense.create({
      data: {
        branchId: dto.branchId,
        category: dto.category,
        amount: dto.amount,
        paymentSource: dto.paymentSource,
        referenceNumber: dto.referenceNumber || null,
        description: dto.description,
      }
    });

    return {
      success: true,
      message: 'Gasto registrado correctamente',
      data: expense
    };
  }
}

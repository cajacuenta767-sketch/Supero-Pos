import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

/* Lo que el servicio necesita. La identidad la pone el controlador desde la
   sesión; el contrato de entrada vive en `dto/create-expense.dto.ts`. */
export interface CreateExpenseInput {
  branchId: string;
  userId: string;
  terminalId: string;
  category: string;
  amount: number;
  paymentSource: 'PETTY_CASH' | 'BANK_ACCOUNT';
  referenceNumber?: string;
  description: string;
  supervisorPin?: string;
}

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  // Fase 4.4: Registro de Salidas de Efectivo Menores (Caja Chica)
  async createExpense(dto: CreateExpenseInput) {
    let autorizadoPor: string | undefined;

    if (dto.paymentSource === 'PETTY_CASH') {
      if (!dto.supervisorPin) {
        throw new BadRequestException('Se requiere PIN de supervisor para retiros de Caja Chica.');
      }

      /* El PIN se comprueba contra el hash guardado de un supervisor, por el
         mismo camino que cualquier otra autorización y con su mismo bloqueo por
         intentos. Aquí se comparaba con la cadena '1234' escrita en el propio
         código del servidor, junto a un comentario que decía «en un caso real,
         validar aquí el PIN»: cualquiera con sesión retiraba de caja chica
         mandando ese número. */
      const autorizacion = await this.authService.authorizeWithPin(
        dto.supervisorPin,
        dto.terminalId,
        'petty_cash_expense',
      );
      autorizadoPor = autorizacion.authorizedBy.name;

      if (!dto.referenceNumber) {
        throw new BadRequestException(
          'Captura obligatoria del número de comprobante o recibo físico respaldatorio.',
        );
      }
    }

    const expense = await this.prisma.expense.create({
      data: {
        branchId: dto.branchId,
        /* Quién sacó el dinero. No se guardaba: un gasto de caja chica quedaba
           registrado sin responsable. */
        userId: dto.userId,
        category: dto.category,
        amount: dto.amount,
        paymentSource: dto.paymentSource,
        referenceNumber: dto.referenceNumber || null,
        description: autorizadoPor
          ? `${dto.description} · autorizado por ${autorizadoPor}`
          : dto.description,
      },
    });

    return {
      success: true,
      message: 'Gasto registrado correctamente',
      data: expense
    };
  }
}

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, UserContext } from '../../common/decorators/current-user.decorator';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /**
   * Registro de un gasto.
   *
   * Saca dinero del negocio. No exigía ningún rol, así que cualquier usuario
   * con sesión podía registrarlos, y la sucursal venía en el cuerpo. El cajero
   * queda fuera a propósito: un gasto lo autoriza quien responde de la caja.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'SUPERVISOR')
  async createExpense(@Body() dto: CreateExpenseDto, @CurrentUser() userCtx: UserContext) {
    return this.expensesService.createExpense({
      ...dto,
      branchId: userCtx.branchId,
      userId: userCtx.id,
      terminalId: `sucursal-${userCtx.branchId}`,
    });
  }
}

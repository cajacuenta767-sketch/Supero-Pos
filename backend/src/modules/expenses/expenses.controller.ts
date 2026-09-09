import { Controller, Post, Body } from '@nestjs/common';
import { ExpensesService, CreateExpenseDto } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  async createExpense(@Body() dto: CreateExpenseDto) {
    return await this.expensesService.createExpense(dto);
  }
}

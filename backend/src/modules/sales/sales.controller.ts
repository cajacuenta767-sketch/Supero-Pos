import { Controller, Post, Get, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { SalesService, CheckoutPayload } from './sales.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, UserContext } from '../../common/decorators/current-user.decorator';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO')
  async checkout(@Body() payload: CheckoutPayload, @CurrentUser() userCtx: UserContext) {
    return this.salesService.checkout({
      ...payload,
      userId: payload.userId || userCtx.id,
      branchId: payload.branchId || userCtx.branchId,
    });
  }

  @Post('cancel/:ticketId')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERVISOR')
  async cancelSale(
    @Param('ticketId') ticketId: string,
    @Body('userId') userId: string,
    @Body('reason') reason: string,
    @CurrentUser() userCtx: UserContext,
  ) {
    return this.salesService.cancelSale(ticketId, userId || userCtx.id, reason);
  }
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly salesService: SalesService) {}

  @Get('z-cut')
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO')
  async getZCutReport(@Query('shiftId') shiftId: string) {
    return this.salesService.getZCutReport(shiftId);
  }
}

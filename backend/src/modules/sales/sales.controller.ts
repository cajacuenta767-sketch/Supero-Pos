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
    /* Quién vende y desde qué sucursal lo dice la sesión, no el cuerpo de la
       petición. Antes era `payload.userId || userCtx.id`: mandando el
       identificador de otro empleado, la venta quedaba a su nombre. */
    return this.salesService.checkout({
      ...payload,
      userId: userCtx.id,
      branchId: userCtx.branchId,
    });
  }

  @Post('cancel/:ticketId')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERVISOR')
  async cancelSale(
    @Param('ticketId') ticketId: string,
    @Body('reason') reason: string,
    @CurrentUser() userCtx: UserContext,
  ) {
    /* La anulación queda a nombre de quien la hace. El `userId` del cuerpo
       dejaba atribuirla a otro, que es justo lo contrario de para qué se
       registra quién anula un ticket. */
    return this.salesService.cancelSale(ticketId, userCtx.id, reason);
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

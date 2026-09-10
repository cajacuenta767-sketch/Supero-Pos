import { Controller, Post, Get, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, UserContext } from '../../common/decorators/current-user.decorator';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO')
  async checkout(@Body() payload: CheckoutDto, @CurrentUser() userCtx: UserContext) {
    /* Quién vende y desde qué sucursal lo dice la sesión, no el cuerpo de la
       petición. Antes era `payload.userId || userCtx.id`: mandando el
       identificador de otro empleado, la venta quedaba a su nombre. */
    return this.salesService.checkout({
      ...payload,
      userId: userCtx.id,
      branchId: userCtx.branchId,
      role: userCtx.role,
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
    return this.salesService.cancelSale(ticketId, userCtx.id, reason, userCtx.branchId);
  }
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly salesService: SalesService) {}

  @Get('z-cut')
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO')
  async getZCutReport(@Query('shiftId') shiftId: string, @CurrentUser() userCtx: UserContext) {
    /* El corte Z dice cuánto efectivo debería haber en una gaveta. Sin acotar,
       un cajero leía el de cualquier turno, incluido el de otra sucursal. */
    return this.salesService.getZCutReport(shiftId, userCtx);
  }
}

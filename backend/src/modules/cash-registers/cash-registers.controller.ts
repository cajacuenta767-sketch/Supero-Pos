import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';
import { OpenShiftDto, CloseShiftDto } from './dto/shift.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, UserContext } from '../../common/decorators/current-user.decorator';

@Controller('cash-registers')
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  /** Cajas de la sucursal de quien pregunta. */
  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO')
  async list(@CurrentUser() userCtx: UserContext) {
    return this.cashRegistersService.listByBranch(userCtx.branchId);
  }

  /* Quién abre y en qué sucursal lo dice la sesión, nunca el cuerpo de la
     petición. Antes era `dto.userId || userCtx.id`: bastaba con mandar el
     identificador de otro empleado para que el turno —su fondo, su conteo y su
     descuadre— quedara registrado a su nombre. */
  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO')
  async openShift(@Body() dto: OpenShiftDto, @CurrentUser() userCtx: UserContext) {
    return this.cashRegistersService.openShift({
      registerId: dto.registerId,
      initialFloat: dto.initialFloat,
      userId: userCtx.id,
      branchId: userCtx.branchId,
    });
  }

  @Post('close')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO')
  async closeShift(@Body() dto: CloseShiftDto, @CurrentUser() userCtx: UserContext) {
    return this.cashRegistersService.closeShift({
      shiftId: dto.shiftId,
      countedCash: dto.countedCash,
      notes: dto.notes,
      userId: userCtx.id,
      branchId: userCtx.branchId,
      role: userCtx.role,
    });
  }

  @Get('active-shift')
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO')
  async getActiveShift(@Query('registerId') registerId: string, @CurrentUser() userCtx: UserContext) {
    return this.cashRegistersService.getActiveShift(userCtx.id, registerId || 'caja-1');
  }
}

import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { CashRegistersService, OpenShiftDto, CloseShiftDto } from './cash-registers.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, UserContext } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/cash-registers')
@UseGuards(RolesGuard)
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO')
  async openShift(@Body() dto: OpenShiftDto, @CurrentUser() userCtx: UserContext) {
    return this.cashRegistersService.openShift({
      ...dto,
      userId: dto.userId || userCtx.id,
      branchId: dto.branchId || userCtx.branchId,
    });
  }

  @Post('close')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO')
  async closeShift(@Body() dto: CloseShiftDto, @CurrentUser() userCtx: UserContext) {
    return this.cashRegistersService.closeShift({
      ...dto,
      userId: dto.userId || userCtx.id,
      branchId: dto.branchId || userCtx.branchId,
    });
  }

  @Get('active-shift')
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO')
  async getActiveShift(@Query('registerId') registerId: string, @CurrentUser() userCtx: UserContext) {
    return this.cashRegistersService.getActiveShift(userCtx.id, registerId || 'caja-1');
  }
}

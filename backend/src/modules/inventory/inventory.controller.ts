import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, UserContext } from '../../common/decorators/current-user.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /* Quién ajusta y en qué sucursal lo dice la sesión. Venían en el cuerpo de la
     petición: el responsable de una merma era quien el cliente dijera, y se
     podía mover el stock de otra tienda cambiando un campo del JSON. */
  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERVISOR', 'ALMACENERO')
  async adjustStock(@Body() dto: AdjustStockDto, @CurrentUser() userCtx: UserContext) {
    return this.inventoryService.adjustStock({
      ...dto,
      branch_id: userCtx.branchId,
      user_id: userCtx.id,
    });
  }
}

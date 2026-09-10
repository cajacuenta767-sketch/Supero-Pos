import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { ReceivePurchaseDto } from './dto/receive-purchase.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, UserContext } from '../../common/decorators/current-user.decorator';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  /**
   * Recepción de mercadería.
   *
   * Suma existencias y recalcula el coste promedio ponderado: es la puerta por
   * la que entra el inventario. No exigía ningún rol —y el guarda deja pasar
   * cuando no hay metadatos—, así que cualquier usuario con sesión podía
   * inflar el almacén. La sucursal y el responsable venían en el cuerpo.
   */
  @Post('receive')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERVISOR', 'ALMACENERO')
  async receivePurchase(@Body() dto: ReceivePurchaseDto, @CurrentUser() userCtx: UserContext) {
    return this.purchasesService.receivePurchase({
      purchaseOrderId: dto.purchaseOrderId,
      items: dto.items,
      branchId: userCtx.branchId,
      userId: userCtx.id,
    });
  }
}

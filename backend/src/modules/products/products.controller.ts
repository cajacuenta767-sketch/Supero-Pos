import { Controller, Get, Query, Param } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, UserContext } from '../../common/decorators/current-user.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** Catálogo vendible de la sucursal de quien pregunta, con sus existencias. */
  @Get('catalog')
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO')
  async catalog(@CurrentUser() userCtx: UserContext) {
    return this.productsService.catalogForBranch(userCtx.branchId);
  }

  /* La sucursal sale de la sesión. Venía en la query y, si faltaba, se caía a
     un `'default-branch'` que no existe en ninguna tabla: se podían consultar
     las existencias de otra tienda cambiando un parámetro de la URL, y sin
     parámetro las existencias salían siempre a cero. */
  @Get('pos-lookup')
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO')
  async posLookup(@Query('q') query: string, @CurrentUser() userCtx: UserContext) {
    return this.productsService.posLookup(query || '', userCtx.branchId);
  }

  @Get('serials/verify/:serial')
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO')
  async verifySerial(@Param('serial') serial: string) {
    return this.productsService.verifySerial(serial);
  }
}

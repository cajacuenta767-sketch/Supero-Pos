import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('api/v1/products')
@UseGuards(RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('pos-lookup')
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO')
  async posLookup(
    @Query('q') query: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.productsService.posLookup(query || '', branchId || 'default-branch');
  }

  @Get('serials/verify/:serial')
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO')
  async verifySerial(@Param('serial') serial: string) {
    return this.productsService.verifySerial(serial);
  }
}

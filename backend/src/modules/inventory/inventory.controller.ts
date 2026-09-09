import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { InventoryService, StockAdjustmentDto } from './inventory.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERVISOR', 'ALMACENERO')
  async adjustStock(@Body() dto: StockAdjustmentDto) {
    return this.inventoryService.adjustStock(dto);
  }
}

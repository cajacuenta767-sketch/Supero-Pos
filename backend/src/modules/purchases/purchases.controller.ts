import { Controller, Post, Body } from '@nestjs/common';
import { PurchasesService, ReceivePurchaseDto } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('receive')
  async receivePurchase(@Body() dto: ReceivePurchaseDto) {
    return await this.purchasesService.receivePurchase(dto);
  }
}

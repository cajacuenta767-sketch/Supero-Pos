import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController, ReportsController } from './sales.controller';

@Module({
  /* `ReportsController` estaba escrito, con sus roles y su servicio detrás,
     pero nunca se registró: `GET /reports/z-cut` respondía 404. El código
     declaraba un endpoint que no existía. */
  controllers: [SalesController, ReportsController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}

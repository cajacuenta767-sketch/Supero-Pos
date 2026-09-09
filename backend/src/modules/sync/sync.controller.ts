import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SyncService } from './sync.service';
import { BatchSyncDto } from './dto/batch-sync.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /* El cuerpo se tipa con una clase decorada, no con una interfaz: las
     interfaces desaparecen al compilar y el ValidationPipe global no tenía nada
     que validar. */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO')
  async batchSync(@Body() payload: BatchSyncDto) {
    return this.syncService.processBatchSync(payload);
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO')
  async uploadSync(@Body() payload: BatchSyncDto) {
    return this.syncService.processBatchSync(payload);
  }
}

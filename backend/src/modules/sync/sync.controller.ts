import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { SyncService, BatchSyncPayload } from './sync.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('api/v1/sync')
@UseGuards(RolesGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO')
  async batchSync(@Body() payload: BatchSyncPayload) {
    return this.syncService.processBatchSync(payload);
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO')
  async uploadSync(@Body() payload: BatchSyncPayload) {
    return this.syncService.processBatchSync(payload);
  }
}

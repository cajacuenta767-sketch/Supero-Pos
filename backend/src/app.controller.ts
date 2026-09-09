import { Controller, Get } from '@nestjs/common';

@Controller('api/v1')
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ONLINE',
      system: 'Supero POS Central API',
      timestamp: new Date().toISOString(),
    };
  }
}

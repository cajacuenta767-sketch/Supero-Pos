import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller('')
export class AppController {
  /** Sonda de salud del worker de sincronización: sin ella el cliente no puede
   *  distinguir «sin red» de «token caducado». */
  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ONLINE',
      system: 'Supero POS Central API',
      timestamp: new Date().toISOString(),
    };
  }
}

import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  /* El gasto de caja chica se autoriza con el PIN de un supervisor, y esa
     comprobación vive en el módulo de autenticación: es el único sitio que
     conoce los hashes y lleva el bloqueo por intentos. */
  imports: [PrismaModule, AuthModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}

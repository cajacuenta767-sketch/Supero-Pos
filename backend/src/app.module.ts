import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { CashRegistersModule } from './modules/cash-registers/cash-registers.module';
import { SyncModule } from './modules/sync/sync.module';
import { UsersModule } from './modules/users/users.module';
import { AuditModule } from './modules/audit/audit.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    /* Límite de peticiones por IP. Sin él, /auth/login admite fuerza bruta
       ilimitada: el bloqueo por usuario no frena a quien prueba usuarios
       distintos, y el del cliente se borra desde la consola del navegador. */
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60_000, limit: 120 },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    SalesModule,
    PurchasesModule,
    ExpensesModule,
    CashRegistersModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [
    /* Guardias globales y en este orden. Antes cada controlador aplicaba
       `RolesGuard` por su cuenta y ninguno aplicaba `JwtAuthGuard`, así que
       `request.user` nunca existía y el rol se leía de una cabecera. Siendo
       globales, lo seguro es el estado por defecto y abrir una ruta exige
       marcarla con @Public(). */
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

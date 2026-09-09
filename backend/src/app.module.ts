import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
  providers: [],
})
export class AppModule {}

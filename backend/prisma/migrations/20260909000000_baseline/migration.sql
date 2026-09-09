-- CreateEnum
CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'LOCKED');

-- CreateEnum
CREATE TYPE "CashShiftStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'QR_GATEWAY');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('UNIT', 'FRACTION', 'SERIALIZED');

-- CreateEnum
CREATE TYPE "SerialStatus" AS ENUM ('IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'QR', 'MIXED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('DAMAGED', 'EXPIRED', 'INTERNAL_USE', 'CYCLE_COUNT_DISCREPANCY');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PURCHASE', 'SALE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('PETTY_CASH', 'BANK_ACCOUNT');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "currentBalance" DECIMAL(12,4) NOT NULL DEFAULT 0,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_shifts" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "initialFloat" DECIMAL(12,4) NOT NULL,
    "expectedCash" DECIMAL(12,4) NOT NULL,
    "countedCash" DECIMAL(12,4),
    "difference" DECIMAL(12,4),
    "status" "CashShiftStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "cash_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "balance" DECIMAL(12,4) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "unitType" "UnitType" NOT NULL DEFAULT 'UNIT',
    "costPrice" DECIMAL(12,4) NOT NULL,
    "retailPrice" DECIMAL(12,4) NOT NULL,
    "wholesalePrice" DECIMAL(12,4) NOT NULL,
    "wholesaleMinQty" DECIMAL(12,4) NOT NULL DEFAULT 10,
    "minStock" DECIMAL(12,4) NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_serials" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "status" "SerialStatus" NOT NULL DEFAULT 'IN_STOCK',

    CONSTRAINT "product_serials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 0,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountPercentage" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "creditLimit" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "currentDebt" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bankDetails" TEXT,
    "currentDebt" DECIMAL(12,4) NOT NULL DEFAULT 0,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    "subtotal" DECIMAL(12,4) NOT NULL,
    "tax" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,4) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "receivedAmount" DECIMAL(12,4) NOT NULL,
    "changeAmount" DECIMAL(12,4) NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "cancellationReason" TEXT,
    "customerSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amountReceived" DECIMAL(12,4) NOT NULL,
    "changeGiven" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "subtotal" DECIMAL(12,4) NOT NULL,
    "serialsUsed" JSONB,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,4) NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderedQty" DECIMAL(12,4) NOT NULL,
    "receivedQty" DECIMAL(12,4) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "originBranchId" TEXT NOT NULL,
    "destBranchId" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'IN_TRANSIT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adjustmentType" "AdjustmentType" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kardex_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "quantityChange" DECIMAL(12,4) NOT NULL,
    "stockBefore" DECIMAL(12,4) NOT NULL,
    "stockAfter" DECIMAL(12,4) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kardex_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "paymentSource" "PaymentSource" NOT NULL,
    "referenceNumber" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" "AttendanceType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "product_serials_serialNumber_key" ON "product_serials"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_productId_branchId_key" ON "stocks"("productId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_taxId_key" ON "customers"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_taxId_key" ON "suppliers"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_ticketNumber_key" ON "sales"("ticketNumber");

-- CreateIndex
CREATE INDEX "sales_shiftId_idx" ON "sales"("shiftId");

-- CreateIndex
CREATE INDEX "sales_branchId_createdAt_idx" ON "sales"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "sale_payments_saleId_idx" ON "sale_payments"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "purchase_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_transferNumber_key" ON "stock_transfers"("transferNumber");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_serials" ADD CONSTRAINT "product_serials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "customer_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "cash_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_originBranchId_fkey" FOREIGN KEY ("originBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destBranchId_fkey" FOREIGN KEY ("destBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kardex_movements" ADD CONSTRAINT "kardex_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kardex_movements" ADD CONSTRAINT "kardex_movements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;


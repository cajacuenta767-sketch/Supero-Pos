# Project Guidelines & Architecture: Supero POS

All system design, feature development, backend data models, UI components, user stories, role permissions, NFR, MVP boundaries, technical stack, PostgreSQL ERD schema, API contracts, UX/UI User Flows, final stack specification, DevOps CI/CD, Sprint Roadmap, Offline Worker ACID Transactions, QA & Deployment Protocol, and Cost Estimation & Deployment Plan MUST strictly follow the specifications detailed in [`DOCS/ESPECIFICACIONES_REQUERIMIENTOS.md`](file:///c:/Users/PC/Desktop/Supero%20Pos/DOCS/ESPECIFICACIONES_REQUERIMIENTOS.md).

## Core System Architecture Principles

1. **Dual Industry Adaptability (Minimarket / Bodega & Electronics)**:
   - Must support **Standard Unit Items** (Latas, botellas, gadgets).
   - Must support **Fractional Bulk Items** (`Standard`, `Fractional` in decimal units like kg/meters).
   - Must support **Strict Serialized Tracking** (`Serialized` requiring mandatory IMEI / serial code registration during purchase receiving and validation during POS checkout).

2. **FIFO & Expiry Management**:
   - Stock entries are grouped into batches with expiry dates (`expiry_date`) and physical aisle/shelf coordinates (`pasillo`, `estante`).

3. **Multi-tier Pricing**:
   - Cost price (historical / weighted average).
   - Selling prices: Retail (`precio_regular`), Wholesale (`precio_mayorista` scaled by volume threshold), Offer (`precio_especial`).
   - Real-time automatic margin percentage calculations (`% margen`).

4. **13-Module Sidebar Hierarchy**:
   1. Hogar (Dashboard)
   2. Gestión de Usuarios (RBAC)
   3. Contactos (Clientes / Proveedores)
   4. Productos (Catálogo Maestro)
   5. Compras
   6. Vender (POS)
   7. Transferencias de Acción / Stock
   8. Ajuste de Stock (Kardex)
   9. Gastos
   10. Cuentas de Pago / Cobro
   11. Informes
   12. Plantillas de Notificación
   13. Ajustes

5. **Technical Stack & Architecture (Paso 5 & Paso 9)**:
   - **Frontend / Terminal POS Desktop**: **Electron + Vite + React + TypeScript** (Main process Node.js, Renderer process React).
   - **Styling & Theme Switching**: **Tailwind CSS v3/v4** with `darkMode: 'class'` toggled on `<html>` root element (Light Mode: #FFFFFF / Dark Mode: #000000).
   - **State Management**: **Zustand** (cart, cash shift, active items, connectivity).
   - **Local DB (Offline-First)**: **SQLite** via **`better-sqlite3`** with `sync_queue` table and 30-second background worker loop.
   - **Backend Server**: **NestJS (TypeScript)** Modular Monolith (`src/modules/auth`, `products`, `inventory`, `sales`, `cash-registers`, `sync`).
   - **ORM & Central Database**: **Prisma ORM** + **PostgreSQL** (`DECIMAL(12,4)` for currency/bulk weight, `JSONB` for `audit_logs`).
   - **Hardware Interfacing**: Electron IPC + **`node-escpos`** for thermal printing/drawer kick; USB HID/virtual serial buffer reader (<10ms) for barcode scanning.

6. **Database Models & ERD Schema (Paso 6)**:
   - **RBAC**: `roles`, `users` (Argon2id password_hash, indexed username).
   - **Catalog & Inventory**: `warehouses`, `categories` (hierarchical parent_id), `products` (sku, indexed barcode, cost_price, sale_price, wholesale_price, unit_type: UNIT/FRACTION/SERIALIZED, min_stock), `product_serials` (unique serial_number/IMEI, status: IN_STOCK/SOLD/RETURNED/DAMAGED), `inventory` (composite key product_id + warehouse_id, decimal stock).
   - **CRM/SRM**: `contacts` (type: CUSTOMER/SUPPLIER, tax_id, credit_limit).
   - **POS Cash**: `cash_registers` (user_id, opening_amount, closing_amount, status: OPEN/CLOSED, opened_at, closed_at).
   - **Sales & Checkout**: `sales` (cash_register_id, user_id, customer_id, subtotal, discount, total, payment_method: CASH/CARD/QR/MIXED, status: COMPLETED/VOIDED), `sale_details` (sale_id, product_id, quantity decimal, unit_price, subtotal, serial_id FK to product_serials).
   - **Security Audit**: `audit_logs` (user_id, action: VOID_SALE/MANUAL_STOCK_ADJUSTMENT/PRICE_OVERRIDE, details JSONB forensic diff, created_at).

7. **API Architecture & Contracts (Paso 7)**:
   - Envelope Pattern: `{ success, status_code, message, data }` & RFC 7807 Error format.
   - Core Endpoints: `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/products/pos-lookup` (<200ms lookup), `/api/v1/products/serials/verify/:sku`, `/api/v1/cash-registers/open`, `/api/v1/cash-registers/:id/close`, `/api/v1/sales`.
   - Sync Contract: `POST /api/v1/sync/batch` receiving offline batch payloads (`terminal_id`, `sync_batch_id`, `transactions`) and returning sync summary (`processed_count`, `failed_count`, `errors`).

8. **UX/UI & User Flows (Paso 8)**:
   - **Dual Themes**: Light Theme (White #FFFFFF, Dark texts #1A1D20, Primary #0D6EFD) & Dark Theme (Pure Black #000000 / #0B0C10, Soft White texts #F3F4F6, Primary #3B82F6).
   - **Split POS Layout**: Left panel (cart & totals), Right panel (quick categories & touch actions).
   - **Keyboard & Touch**: Quick shortcuts (`F1` pay, `F2` search) and touch-friendly controls.
   - **Mandatory Modals**: Decimal prompt for fractional/bulk items, mandatory IMEI modal for serialized items.

9. **DevOps & CI/CD Strategy (Paso 10)**:
   - **Git Workflow**: Protected `main`, `develop` branch for integration, `feature/*` and `hotfix/*`.
   - **Docker Orchestration**: `docker-compose.yml` with `postgres:15-alpine` container (`pos_postgres_core`) and NestJS backend (`pos_nestjs_backend`).
   - **Environments**: Dev (hot-reload), Staging (mirror stress tests), Production (Nginx reverse proxy with SSL/TLS).
   - **GitHub Actions CI/CD**: Automatic ESLint, Prettier, Jest tests, `tsc --noEmit` validation, Docker build & push, SSH deployment, and `electron-builder` `.exe` Windows installer compilation.

10. **Sprint Roadmap (Paso 11)**:
    - **Sprint 0** (Sem 1-2): Boilerplates, Docker PostgreSQL 15, Prisma, Electron+React+Vite, Tailwind dark theme, better-sqlite3.
    - **Sprint 1** (Sem 3-4): Auth (Argon2id, JWT, Guards), RBAC, Catalog & 3 Unit Types (Unit, Fraction, Serialized/IMEI), Wholesale prices.
    - **Sprint 2** (Sem 5-6): POS Core UI (split layout, F1/F2 shortcuts, barcode scanner), Cash Shifts (Opening/Closing), IMEI mandatory modal, Mixed payments & Change calculator.
    - **Sprint 3** (Sem 7-8): Atomic Kardex ACID, Supplier Receivings, Stock Adjustments, Audit Logs (JSONB), Expense Logs.
    - **Sprint 4** (Sem 9-10): `sync_queue` table, 30s background sync worker, `POST /api/v1/sync/batch` timestamp conflict solver, Initial Dashboard.
    - **Sprint 5** (Sem 11-12): Thermal printing ESC/POS & cash drawer kick, Scale serial integration, Stress QA, Electron-Builder `.exe` releases.

11. **Offline Worker & Atomic ACID Logic**:
    - `sync_queue` SQLite table (`id`, `payload_type`, `local_id`, `payload_data`, `attempts`, `status: PENDING/SYNCING/SYNCED/FAILED`).
    - 30s background worker loop: HTTP ping -> batch fetch 50 -> `POST /api/v1/sync/batch` -> update status to `SYNCED` / flag `FAILED` if > 5 attempts.
    - `better-sqlite3` `db.transaction()`: atomic header insertion, stock validation & decimal deduction, detail insertion, IMEI status update to `SOLD`, and `sync_queue` insertion in one single atomic transaction.

12. **QA Strategy & Deployment Protocol (Paso 12)**:
    - **QA**: Jest Unit (>85% coverage), Supertest Integration (NestJS Guards, RFC 7807), Playwright E2E Electron (Full POS checkout flow).
    - **Resilience QA**: Chaos Engineering abrupt offline test (no UI freezes, local ticket print, `sync_queue` insert); 2,000 transaction batch stress test (10 offline POS terminals, timestamp reconciliation).
    - **Go-Live**: Phase A Sandbox hardware calibration -> Phase B Shadow Running 1 week in real branch -> Phase C GitHub Actions CI/CD automated `.exe` rollout.

13. **Cost Estimation & Infrastructure (Paso 13)**:
    - **Cloud Server**: VPS 2 vCPU / 4GB RAM / 80GB SSD ($20-$40 USD/mo).
    - **POS Hardware**: Mini PC i3, 80mm ESC/POS Printer ($80-$120), USB Barcode Reader ($25-$45), Cash Drawer ($45-$70), Serial/USB Scale ($150-$250).
    - **Development Allocation (Sky Tech)**: Tech Lead (NestJS/Docker/PostgreSQL), Frontend/Desktop Dev (Electron/React/Tailwind/Zustand), QA/DevOps (Jest/Playwright/GitHub Actions).

14. **Continuous Operation, Maintenance & Scalability (Paso 14)**:
    - **Observability**: CPU/RAM/latency/SSD monitoring and centralized log error tracking.
    - **Automated Updates**: Silent background Electron updates and controlled SQLite schema migrations.
    - **Support Tiers**: Level 1 (Operational user support) & Level 2 (Technical/hardware/sync queue support).
    - **Future Roadmap**: Fiscal electronic invoicing compliance, BI analytics data lake, and unlimited multi-branch scaling.

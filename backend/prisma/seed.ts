// Seed inicial para desarrollo local: roles, sucursales y usuarios demo.
// Idempotente (usa upsert). Ejecutar con: npx prisma db seed
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'ADMIN', permissions: { all: true } },
  { name: 'SUPERVISOR', permissions: { sales: true, inventory: true, reports: true, cash: true } },
  { name: 'CAJERO', permissions: { sales: true, cash: true } },
  { name: 'ALMACENERO', permissions: { inventory: true, purchases: true } },
];

// Los ids coinciden con DEMO_BRANCHES del frontend (useAuthStore.ts)
const BRANCHES = [
  { id: 'branch-1', name: 'Sucursal Central - Av. Principal #123', address: 'Av. Principal #123', phone: '000-000-001' },
  { id: 'branch-2', name: 'Sucursal Norte - Mall Plaza Local 45', address: 'Mall Plaza Local 45', phone: '000-000-002' },
  { id: 'branch-3', name: 'Sucursal Sur - Av. Comercial #789', address: 'Av. Comercial #789', phone: '000-000-003' },
];

// Credenciales demo mostradas en LoginView.tsx
const USERS = [
  { username: 'admin', fullName: 'Administrador Demo', email: 'admin@superopos.local', password: 'SuperoPOS2026', role: 'ADMIN' },
  { username: 'supervisor', fullName: 'Supervisor Demo', email: 'supervisor@superopos.local', password: 'supervisor123', role: 'SUPERVISOR' },
  { username: 'cajero', fullName: 'Cajero Demo', email: 'cajero@superopos.local', password: 'cajero123', role: 'CAJERO' },
  { username: 'almacenero', fullName: 'Almacenero Demo', email: 'almacenero@superopos.local', password: 'almacen123', role: 'ALMACENERO' },
];

async function main() {
  const roleIds: Record<string, string> = {};
  for (const role of ROLES) {
    const r = await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: role,
    });
    roleIds[role.name] = r.id;
  }

  for (const branch of BRANCHES) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      update: { name: branch.name, address: branch.address, phone: branch.phone },
      create: branch,
    });
  }

  for (const u of USERS) {
    const passwordHash = await argon2.hash(u.password, { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash, roleId: roleIds[u.role], isActive: true },
      create: {
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        passwordHash,
        roleId: roleIds[u.role],
        branchId: BRANCHES[0].id,
      },
    });
  }

  console.log(`Seed completado: ${ROLES.length} roles, ${BRANCHES.length} sucursales, ${USERS.length} usuarios.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

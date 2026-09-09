/**
 * Siembra mínima de una instalación nueva.
 *
 * Sin ella, una base recién migrada no tiene roles, ni sucursal, ni una sola
 * cuenta con la que entrar: la API arranca y nadie puede iniciar sesión.
 *
 * No hay contraseñas ni PIN escritos aquí. Se toman del entorno y, si faltan,
 * se generan al azar y se imprimen una vez por consola: un valor por defecto
 * conocido en el repositorio es una puerta abierta en cada instalación que lo
 * use.
 *
 *   npm run prisma:seed
 *
 * Es idempotente: se puede volver a ejecutar sin duplicar nada.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/** Contraseña legible pero no adivinable, para enseñarla una sola vez. */
const generatedSecret = (bytes: number) => randomBytes(bytes).toString('base64url');

/** PIN numérico de seis dígitos, sin sesgo hacia los primeros valores. */
const generatedPin = () => String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');

const ROLES: Array<{ name: string; permissions: Record<string, boolean> }> = [
  {
    name: 'ADMIN',
    permissions: {
      can_void_sale: true,
      can_apply_discount: true,
      can_manage_users: true,
      can_adjust_stock: true,
      can_view_reports: true,
    },
  },
  {
    name: 'SUPERVISOR',
    permissions: {
      can_void_sale: true,
      can_apply_discount: true,
      can_manage_users: false,
      can_adjust_stock: true,
      can_view_reports: true,
    },
  },
  {
    name: 'CAJERO',
    permissions: {
      can_void_sale: false,
      can_apply_discount: false,
      can_manage_users: false,
      can_adjust_stock: false,
      can_view_reports: false,
    },
  },
  {
    name: 'ALMACENERO',
    permissions: {
      can_void_sale: false,
      can_apply_discount: false,
      can_manage_users: false,
      can_adjust_stock: true,
      can_view_reports: false,
    },
  },
];

async function main() {
  const roles = new Map<string, string>();
  for (const role of ROLES) {
    const saved = await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: { name: role.name, permissions: role.permissions },
    });
    roles.set(role.name, saved.id);
  }
  console.log(`Roles listos: ${[...roles.keys()].join(', ')}`);

  /* La sucursal matriz. `Branch.name` no es único en el esquema, así que se
     busca antes de crear en vez de hacer `upsert`. */
  const branchName = process.env.SEED_BRANCH_NAME ?? 'Sucursal Central';
  let branch = await prisma.branch.findFirst({ where: { name: branchName } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: branchName,
        address: process.env.SEED_BRANCH_ADDRESS ?? 'Dirección por definir',
        phone: process.env.SEED_BRANCH_PHONE ?? '',
      },
    });
  }
  console.log(`Sucursal lista: ${branch.name}`);

  const username = process.env.SEED_ADMIN_USER ?? 'admin';
  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    console.log(`El usuario «${username}» ya existe: no se toca su contraseña ni su PIN.`);
    return;
  }

  const password = process.env.SEED_ADMIN_PASSWORD ?? generatedSecret(12);
  const pin = process.env.SEED_SUPERVISOR_PIN ?? generatedPin();

  await prisma.user.create({
    data: {
      username,
      fullName: process.env.SEED_ADMIN_NAME ?? 'Administrador',
      email: process.env.SEED_ADMIN_EMAIL ?? `${username}@example.invalid`,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      /* El PIN se guarda con el mismo tratamiento que la contraseña. */
      supervisorPinHash: await argon2.hash(pin, { type: argon2.argon2id }),
      roleId: roles.get('ADMIN') as string,
      branchId: branch.id,
      isActive: true,
    },
  });

  console.log('\n─────────────────────────────────────────────');
  console.log(`  Usuario ...... ${username}`);
  if (!process.env.SEED_ADMIN_PASSWORD) console.log(`  Contraseña ... ${password}`);
  if (!process.env.SEED_SUPERVISOR_PIN) console.log(`  PIN ........... ${pin}`);
  console.log('─────────────────────────────────────────────');
  console.log('  Anótelos ahora: solo se muestran una vez.');
  console.log('  Cámbielos en el primer inicio de sesión.\n');
}

main()
  .catch((error) => {
    console.error('La siembra falló:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

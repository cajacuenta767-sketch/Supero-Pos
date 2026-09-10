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
import { readFileSync } from 'fs';
import { join } from 'path';

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

  /* Una sucursal sin caja física no puede vender: al sincronizar, el servidor
     rechaza la venta por «caja inexistente» y el ticket se queda atascado en la
     terminal. La siembra no la creaba. */
  const registerName = process.env.SEED_REGISTER_NAME ?? 'Caja 1 Principal';
  let register = await prisma.cashRegister.findFirst({
    where: { branchId: branch.id, name: registerName },
  });
  if (!register) {
    register = await prisma.cashRegister.create({
      data: { branchId: branch.id, name: registerName },
    });
  }
  console.log(`Caja lista: ${register.name}`);

  /* Catálogo de arranque, el mismo que trae la terminal y con sus mismos
     identificadores. Sin productos en el servidor, cada venta se rechazaba al
     sincronizar con «el producto no existe en el catálogo central» y se quedaba
     atascada en la cola local.

     Es una siembra de arranque, no un catálogo real: en una instalación de
     verdad se importa el del negocio. Lo que importa es que las dos partes
     empiecen desde la misma lista. */
  const catalogo: Array<{
    id: string;
    sku: string;
    barcode: string;
    name: string;
    category: string;
    /* La marca es opcional en la terminal y obligatoria en la base: sin ella,
       «Genérico», que es lo que dice la etiqueta de un producto sin marca. */
    brand: string;
    unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
    cost_price: string;
    sale_price: string;
    wholesale_price: string;
    wholesale_min_qty: string;
    stock: string;
    min_stock: string;
  }> = JSON.parse(readFileSync(join(__dirname, 'catalogo-inicial.json'), 'utf8'));

  const categorias = new Map<string, string>();
  const marcas = new Map<string, string>();

  for (const producto of catalogo) {
    if (!categorias.has(producto.category)) {
      const existente = await prisma.category.findFirst({ where: { name: producto.category } });
      const fila = existente ?? (await prisma.category.create({ data: { name: producto.category } }));
      categorias.set(producto.category, fila.id);
    }
    if (!marcas.has(producto.brand)) {
      const existente = await prisma.brand.findFirst({ where: { name: producto.brand } });
      const fila = existente ?? (await prisma.brand.create({ data: { name: producto.brand } }));
      marcas.set(producto.brand, fila.id);
    }

    const datos = {
      sku: producto.sku,
      barcode: producto.barcode,
      name: producto.name,
      categoryId: categorias.get(producto.category) as string,
      brandId: marcas.get(producto.brand) as string,
      unitType: producto.unit_type,
      costPrice: producto.cost_price,
      retailPrice: producto.sale_price,
      wholesalePrice: producto.wholesale_price,
      wholesaleMinQty: producto.wholesale_min_qty,
      minStock: producto.min_stock,
      isActive: true,
    };

    await prisma.product.upsert({
      where: { id: producto.id },
      update: datos,
      create: { id: producto.id, ...datos },
    });

    /* Las existencias son por sucursal: un producto sin fila de stock aquí no
       se puede vender ni descontar. */
    await prisma.stock.upsert({
      where: { productId_branchId: { productId: producto.id, branchId: branch.id } },
      update: {},
      create: { productId: producto.id, branchId: branch.id, quantity: producto.stock },
    });
  }
  console.log(`Catálogo listo: ${catalogo.length} productos con sus existencias`);

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

# Supero POS

Sistema de punto de venta (POS) con backend **NestJS + Prisma + PostgreSQL** y terminal de escritorio **Electron + Vite + React**.
Las especificaciones completas están en [`DOCS/ESPECIFICACIONES_REQUERIMIENTOS.md`](DOCS/ESPECIFICACIONES_REQUERIMIENTOS.md).

## Arranque en local

### Requisitos

- Node.js 18 o superior (probado con Node 22)
- PostgreSQL 15 o superior (o Docker para usar `docker-compose.yml`)

### 1. Base de datos

Con Docker:

```bash
docker compose up -d postgres_db
```

Sin Docker, crear el usuario y la base de datos que espera el proyecto:

```sql
CREATE USER pos_admin WITH PASSWORD 'secure_password_db' CREATEDB;
CREATE DATABASE pos_central_db OWNER pos_admin;
```

### 2. Backend (puerto 3000)

```bash
cd backend
npm install
cat > .env <<'ENV'
DATABASE_URL=postgresql://pos_admin:secure_password_db@localhost:5432/pos_central_db?schema=public
JWT_SECRET=super_secret_jwt_key_2026
PORT=3000
ENV
npx prisma generate
npx prisma db push      # crea las tablas
npx prisma db seed      # roles, sucursales y usuarios demo
npm run start:dev
```

Comprobación: `curl http://localhost:3000/api/v1/health`

### 3. Frontend (puerto 5173)

```bash
cd frontend
npm install
npm run dev
```

Abrir <http://localhost:5173>. Para lanzarlo como app de escritorio:

```bash
VITE_DEV_SERVER_URL=http://localhost:5173 npm run electron:start
```

### Usuarios demo (creados por el seed)

| Usuario      | Contraseña      | Rol        |
|--------------|-----------------|------------|
| `admin`      | `SuperoPOS2026` | ADMIN      |
| `supervisor` | `supervisor123` | SUPERVISOR |
| `cajero`     | `cajero123`     | CAJERO     |
| `almacenero` | `almacen123`    | ALMACENERO |

Si el backend no está disponible, el frontend entra en modo offline con un usuario local de demostración.

# Puesta en marcha

Lo que hay que hacer para pasar de un repositorio clonado a una tienda
vendiendo. Todo lo de aquí está probado contra PostgreSQL 16 real; los valores
de ejemplo son de ejemplo, no valores por defecto que el sistema acepte.

## Lo que no se puede saltar

El sistema se niega a arrancar sin estas dos cosas, en lugar de degradarse en
silencio:

| Variable | Dónde | Por qué |
|---|---|---|
| `JWT_SECRET` | backend | Sin él la API no arranca en producción. Mínimo 32 caracteres. Un secreto por defecto en el repositorio deja que cualquiera firme un token de administrador. |
| `DATABASE_URL` | backend | Cadena de conexión de PostgreSQL. |

Un secreto se genera así, y se guarda donde se guarden los secretos —no en el
repositorio—:

```bash
openssl rand -base64 48
```

## Base de datos

```bash
cd backend
export DATABASE_URL="postgresql://usuario:clave@servidor:5432/supero_pos?schema=public"

npm ci
npx prisma generate
npm run prisma:deploy     # aplica las migraciones
npm run prisma:seed       # roles, sucursal y la primera cuenta
```

`prisma:seed` es idempotente: se puede repetir sin duplicar nada y no toca la
contraseña de un usuario que ya exista.

Si no se le dan valores, **genera una contraseña y un PIN al azar y los imprime
una sola vez**. Anótelos en ese momento. Para fijarlos desde el entorno:

```bash
SEED_ADMIN_USER=admin \
SEED_ADMIN_NAME="Nombre del responsable" \
SEED_ADMIN_EMAIL=responsable@sutienda.bo \
SEED_ADMIN_PASSWORD='…' \
SEED_SUPERVISOR_PIN='…' \
SEED_BRANCH_NAME="Sucursal Central" \
SEED_BRANCH_ADDRESS="Av. Principal #123" \
npm run prisma:seed
```

## API

```bash
cd backend
export JWT_SECRET="…"
export DATABASE_URL="…"
export NODE_ENV=production
npm run build && npm run start:prod
```

Escucha en el puerto 3000 bajo `/api/v1`. `CORS_ORIGINS` limita desde dónde se
la puede llamar; sin definir, solo acepta `http://localhost:5173`.

## Terminal

```bash
cd frontend
npm ci
npm run build            # deja el resultado en dist/
```

`frontend/.env.production` debe tener `VITE_DEMO_MODE=false`. **La variable
tiene que estar definida, no solo ausente**: sin ella, Vite no puede doblar la
condición a falso y las credenciales de demostración sobreviven al empaquetado.
La integración continua lo comprueba en cada cambio.

| Variable | Para qué |
|---|---|
| `VITE_API_URL` | Dónde está la API. Por defecto `http://localhost:3000/api/v1`. |
| `VITE_DEMO_MODE` | `false` en producción. |
| `VITE_SUPERVISOR_PIN` | Solo para el respaldo sin conexión (ver abajo). |

## El PIN de supervisor

Con red, la autorización la decide el servidor: el PIN viaja, se compara contra
su hash y vuelve un sí o un no. El número no está en el equipo.

Cada supervisor tiene el suyo en `users.supervisorPinHash`. La siembra pone el
del primer administrador; los demás se asignan desde la gestión de usuarios.

Sin red queda una comprobación local contra `VITE_SUPERVISOR_PIN`, para que una
tienda desconectada pueda anular un cobro mal hecho. Es un control operativo, no
una barrera: el valor está en el equipo. La terminal lo dice cuando ocurre
—«autorizado sin conexión, se re-verificará al sincronizar»—. Si no se define la
variable, sin red no se autoriza nada, que es la postura segura.

## Impresora

Se admiten las dos conexiones de mostrador:

- **Red**: puerto 9100 (RAW/JetDirect). Se configura la dirección IP.
- **Dispositivo**: `/dev/usb/lp0` en Linux, `\\.\COM3` en Windows, o una cola
  compartida.

El ancho de papel —80 mm o 58 mm—, el pie del ticket y la leyenda legal se
configuran en *Notificaciones* y salen impresos.

El texto va en la página de códigos PC858, que es la que lleva las vocales
acentuadas y la eñe. Está verificado byte a byte contra un receptor RAW, pero
**no contra una impresora física**: antes de abrir la tienda, imprima un ticket
de prueba con acentos en el nombre de la empresa y compruébelo en el papel.

## Lo que queda por hacer antes de abrir

- [ ] `JWT_SECRET` generado y guardado fuera del repositorio.
- [ ] `DATABASE_URL` apuntando a una base con copias de seguridad.
- [ ] Migraciones aplicadas y siembra ejecutada.
- [ ] Contraseña y PIN del primer administrador cambiados tras el primer acceso.
- [ ] `VITE_DEMO_MODE=false` en el empaquetado que se instala.
- [ ] `CORS_ORIGINS` con el dominio real de la terminal.
- [ ] Un ticket de prueba impreso y leído en papel.
- [ ] Una venta, un arqueo y una anulación hechos de principio a fin en la
      terminal que se va a usar.

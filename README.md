# Supero POS

Punto de venta para minimarket y electrónica, pensado para funcionar cuando se
cae internet: la caja cobra igual y las ventas suben a la central en cuanto hay
red.

Vende productos por unidad, a granel en decimales —0,450 kg de queso— y con
seguimiento por IMEI. Imprime en térmica, controla el arqueo de caja y lleva un
kardex donde todo movimiento deja asiento.

## Puesta en marcha

Está en **[DESPLIEGUE.md](DESPLIEGUE.md)**: variables que el sistema exige,
migraciones, siembra y lo que hay que comprobar antes de abrir la tienda.

Lo mínimo, con PostgreSQL a mano:

```bash
# API
cd backend
export DATABASE_URL="postgresql://usuario:clave@localhost:5432/supero_pos?schema=public"
export JWT_SECRET="$(openssl rand -base64 48)"
npm ci && npx prisma generate
npm run prisma:deploy && npm run prisma:seed   # anote la contraseña y el PIN
npm run start:dev

# Terminal
cd frontend
npm ci && npm run dev
```

## Cómo está montado

| | |
|---|---|
| **Terminal** | React 18 + TypeScript, Vite, Tailwind. Empaquetada con Electron para el mostrador. |
| **API** | NestJS + Prisma sobre PostgreSQL. |
| **Sin conexión** | La venta se registra en la terminal y entra en una cola. El trabajador de sincronización la sube y **solo borra de la cola lo que el servidor confirma**. |
| **Impresión** | ESC/POS sobre puerto 9100 o dispositivo del sistema, en página de códigos PC858. |

### Decisiones que conviene conocer antes de tocar el código

- **El dinero se calcula en centavos enteros**, no en coma flotante
  (`utils/money.ts`). Un céntimo perdido por redondeo descuadra el arqueo.
- **Las fechas se guardan como instante ISO**, nunca como texto. «14/08/2026»
  ordenado como cadena pone agosto antes que septiembre.
- **Las existencias cambian por un solo sitio**: `applyMovements` del catálogo.
  Todo movimiento deja asiento en el kardex; sin él, un stock que no cuadra no
  se puede explicar.
- **La autorización por PIN la decide el servidor.** Sin red hay una
  comprobación local, que es un control operativo y no una barrera, y la
  terminal lo dice cuando ocurre.
- **Las imágenes viven en IndexedDB**, no en `localStorage`: los registros solo
  llevan una referencia.

## Verificar

```bash
cd frontend && npx tsc --noEmit && npm run lint && npx vitest run && npm run build
cd backend  && npx tsc --noEmit && npx eslint src --ext .ts && npx jest
```

La integración continua además levanta PostgreSQL, aplica las migraciones,
comprueba que no falte ninguna, siembra dos veces para verificar que es
idempotente, y revisa que el empaquetado de la terminal no lleve credenciales
ni el PIN de demostración.

## Cuentas de demostración

Solo existen con `VITE_DEMO_MODE=true`. En un empaquetado de producción, Vite
elimina el bloque entero y la integración continua lo comprueba.

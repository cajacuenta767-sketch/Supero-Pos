import { IS_DEMO_MODE } from './env';

export interface DemoAccount {
  user: string;
  pass: string;
  label: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'CAJERO' | 'ALMACENERO';
  name: string;
  id: string;
}

/**
 * Cuentas de demostración.
 *
 * Antes vivían en `useAuthStore` y en `LoginView` sin condición alguna, así que
 * viajaban en el build de producción: bastaba dejar la terminal sin red para que
 * el respaldo offline las aceptara y entrar como administrador.
 *
 * Ahora dependen de `IS_DEMO_MODE`, que Vite resuelve al compilar. Con
 * `VITE_DEMO_MODE` distinto de `true` este arreglo queda vacío y el
 * empaquetador elimina las cadenas del bundle.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = IS_DEMO_MODE
  ? [
      {
        user: 'admin',
        pass: 'SuperoPOS2026',
        label: 'Admin',
        role: 'ADMIN',
        name: 'Administrador General',
        id: 'usr-admin',
      },
      {
        user: 'supervisor',
        pass: 'supervisor123',
        label: 'Supervisor',
        role: 'SUPERVISOR',
        name: 'María López (Supervisor)',
        id: 'usr-supervisor',
      },
      {
        user: 'cajero',
        pass: 'cajero123',
        label: 'Cajero',
        role: 'CAJERO',
        name: 'Juan Pérez (Cajero)',
        id: 'usr-cajero',
      },
      {
        user: 'almacenero',
        pass: 'almacen123',
        label: 'Almacén',
        role: 'ALMACENERO',
        name: 'Carlos Ruiz (Almacén)',
        id: 'usr-almacen',
      },
    ]
  : [];

export const findDemoAccount = (username: string, password: string): DemoAccount | undefined => {
  if (!IS_DEMO_MODE) return undefined;
  const clean = username.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((a) => a.user === clean && a.pass === password);
};

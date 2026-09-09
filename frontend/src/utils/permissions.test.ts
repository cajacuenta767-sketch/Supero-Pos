import { describe, expect, it } from 'vitest';
import { canAccessView, hasPermission, ROLE_PERMISSIONS, VIEW_PERMISSIONS } from './permissions';

describe('coherencia de la matriz', () => {
  it('todos los apartados declaran un permiso que existe en los cuatro roles', () => {
    for (const [view, permission] of Object.entries(VIEW_PERMISSIONS)) {
      for (const role of Object.keys(ROLE_PERMISSIONS)) {
        expect(
          ROLE_PERMISSIONS[role][permission],
          `${role} no declara ${permission} (apartado ${view})`,
        ).toBeTypeOf('boolean');
      }
    }
  });
});

describe('fallo hacia el privilegio mínimo', () => {
  it('sin rol no se concede nada', () => {
    expect(hasPermission(undefined, 'can_access_pos')).toBe(false);
    expect(hasPermission(null, 'can_manage_users')).toBe(false);
    expect(canAccessView(undefined, 'settings')).toBe(false);
  });

  it('un rol desconocido no se concede nada', () => {
    // @ts-expect-error se comprueba a propósito un rol fuera de la unión
    expect(hasPermission('SUPERADMIN', 'can_manage_users')).toBe(false);
  });

  it('un apartado sin permiso declarado queda restringido', () => {
    expect(canAccessView('ADMIN', 'apartado-inexistente')).toBe(false);
  });
});

describe('separación de funciones', () => {
  it('el cajero no administra usuarios ni ajustes', () => {
    expect(canAccessView('CAJERO', 'users')).toBe(false);
    expect(canAccessView('CAJERO', 'settings')).toBe(false);
    expect(canAccessView('CAJERO', 'accounts')).toBe(false);
  });

  it('el cajero sí vende y consulta informes', () => {
    expect(canAccessView('CAJERO', 'pos')).toBe(true);
    expect(canAccessView('CAJERO', 'reports')).toBe(true);
  });

  it('el almacenero no opera caja', () => {
    expect(canAccessView('ALMACENERO', 'pos')).toBe(false);
    expect(canAccessView('ALMACENERO', 'products')).toBe(true);
    expect(canAccessView('ALMACENERO', 'transfers')).toBe(true);
  });

  it('el supervisor no gestiona usuarios ni borra productos', () => {
    expect(canAccessView('SUPERVISOR', 'users')).toBe(false);
    expect(hasPermission('SUPERVISOR', 'can_delete_product')).toBe(false);
    expect(hasPermission('SUPERVISOR', 'can_void_sale')).toBe(true);
  });

  it('el administrador accede a todos los apartados', () => {
    for (const view of Object.keys(VIEW_PERMISSIONS)) {
      expect(canAccessView('ADMIN', view), view).toBe(true);
    }
  });
});

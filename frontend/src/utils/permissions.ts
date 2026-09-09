export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'CAJERO' | 'ALMACENERO';

export type PermissionKey =
  | 'can_access_pos'
  | 'can_void_sale'
  | 'can_apply_discount'
  | 'can_override_price'
  | 'can_view_sales_history'
  | 'can_open_close_cash'
  | 'can_manage_products'
  | 'can_create_product'
  | 'can_edit_product'
  | 'can_delete_product'
  | 'can_manage_stock'
  | 'can_adjust_stock'
  | 'can_manage_purchases'
  | 'can_manage_transfers'
  | 'can_view_reports'
  | 'can_view_financial_reports'
  | 'can_manage_expenses'
  | 'can_manage_users'
  | 'can_manage_settings'
  | 'can_manage_hr'
  | 'can_view_dashboard'
  | 'can_manage_contacts'
  | 'can_manage_notifications';

export const ROLE_PERMISSIONS: Record<string, Record<PermissionKey, boolean>> = {
  ADMIN: {
    can_view_dashboard: true,
    can_manage_contacts: true,
    can_manage_notifications: true,
    can_access_pos: true,
    can_void_sale: true,
    can_apply_discount: true,
    can_override_price: true,
    can_view_sales_history: true,
    can_open_close_cash: true,
    can_manage_products: true,
    can_create_product: true,
    can_edit_product: true,
    can_delete_product: true,
    can_manage_stock: true,
    can_adjust_stock: true,
    can_manage_purchases: true,
    can_manage_transfers: true,
    can_view_reports: true,
    can_view_financial_reports: true,
    can_manage_expenses: true,
    can_manage_users: true,
    can_manage_settings: true,
    can_manage_hr: true,
  },
  SUPERVISOR: {
    can_view_dashboard: true,
    can_manage_contacts: true,
    can_manage_notifications: true,
    can_access_pos: true,
    can_void_sale: true,
    can_apply_discount: true,
    can_override_price: true,
    can_view_sales_history: true,
    can_open_close_cash: true,
    can_manage_products: true,
    can_create_product: true,
    can_edit_product: true,
    can_delete_product: false,
    can_manage_stock: true,
    can_adjust_stock: true,
    can_manage_purchases: true,
    can_manage_transfers: true,
    can_view_reports: true,
    can_view_financial_reports: true,
    can_manage_expenses: true,
    can_manage_users: false,
    can_manage_settings: false,
    can_manage_hr: false,
  },
  CAJERO: {
    can_view_dashboard: true,
    can_manage_contacts: true,
    can_manage_notifications: false,
    can_access_pos: true,
    can_void_sale: false,
    can_apply_discount: false,
    can_override_price: false,
    can_view_sales_history: true,
    can_open_close_cash: true,
    can_manage_products: false,
    can_create_product: false,
    can_edit_product: false,
    can_delete_product: false,
    can_manage_stock: false,
    can_adjust_stock: false,
    can_manage_purchases: false,
    can_manage_transfers: false,
    can_view_reports: true,
    can_view_financial_reports: false,
    can_manage_expenses: false,
    can_manage_users: false,
    can_manage_settings: false,
    can_manage_hr: false,
  },
  ALMACENERO: {
    can_view_dashboard: true,
    can_manage_contacts: true,
    can_manage_notifications: false,
    can_access_pos: false,
    can_void_sale: false,
    can_apply_discount: false,
    can_override_price: false,
    can_view_sales_history: false,
    can_open_close_cash: false,
    can_manage_products: true,
    can_create_product: true,
    can_edit_product: true,
    can_delete_product: false,
    can_manage_stock: true,
    can_adjust_stock: true,
    can_manage_purchases: true,
    can_manage_transfers: true,
    can_view_reports: false,
    can_view_financial_reports: false,
    can_manage_expenses: false,
    can_manage_users: false,
    can_manage_settings: false,
    can_manage_hr: false,
  },
};

/**
 * Permiso que gobierna cada apartado.
 *
 * Antes la autorización vivía en dos sitios: esta matriz, consultada por tres
 * vistas, y un arreglo `roles: [...]` escrito a mano en la barra lateral. Nada
 * los mantenía coherentes, así que podían decir cosas distintas sobre lo mismo.
 * Este mapa es la única fuente: lo usan la barra lateral para decidir qué se ve
 * y App para decidir qué se renderiza.
 */
export const VIEW_PERMISSIONS: Record<string, PermissionKey> = {
  home: 'can_view_dashboard',
  pos: 'can_access_pos',
  products: 'can_manage_products',
  purchases: 'can_manage_purchases',
  transfers: 'can_manage_transfers',
  'stock-adjust': 'can_adjust_stock',
  contacts: 'can_manage_contacts',
  reports: 'can_view_reports',
  accounts: 'can_view_financial_reports',
  expenses: 'can_manage_expenses',
  users: 'can_manage_users',
  hr: 'can_manage_hr',
  notifications: 'can_manage_notifications',
  settings: 'can_manage_settings',
};

export function hasPermission(
  role: UserRole | undefined | null,
  permission: PermissionKey,
): boolean {
  if (!role) return false;
  /* Sin atajo para ADMIN: antes devolvía `true` antes de mirar la tabla, con lo
     que su fila era código muerto y cada permiso nuevo se le concedía solo, sin
     que nadie lo decidiera. */
  const permissions = ROLE_PERMISSIONS[role.toUpperCase()];
  return permissions ? permissions[permission] === true : false;
}

/** Permiso exigido por un apartado. Un apartado sin entrada se considera
 *  restringido: lo seguro es el estado por defecto. */
export function canAccessView(role: UserRole | undefined | null, viewId: string): boolean {
  const permission = VIEW_PERMISSIONS[viewId];
  if (!permission) return false;
  return hasPermission(role, permission);
}

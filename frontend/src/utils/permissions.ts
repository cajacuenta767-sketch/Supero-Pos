export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'CAJERO' | 'ALMACENERO' | string;

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
  | 'can_manage_hr';

export const ROLE_PERMISSIONS: Record<string, Record<PermissionKey, boolean>> = {
  ADMIN: {
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

export function hasPermission(
  role: UserRole | undefined | null,
  permission: PermissionKey,
): boolean {
  if (!role) return false;
  const normalizedRole = role.toUpperCase();
  if (normalizedRole === 'ADMIN') return true;
  const permissions = ROLE_PERMISSIONS[normalizedRole];
  return permissions ? !!permissions[permission] : false;
}

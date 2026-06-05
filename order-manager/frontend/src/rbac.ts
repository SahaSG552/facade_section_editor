// RBAC roles and permissions skeleton
// Based on requirements: Админ, Менеджер продаж, Конструктор/дизайнер, Технолог, Склад, Руководитель

export type UserRole =
  | 'admin'
  | 'sales_manager'
  | 'designer'
  | 'technologist'
  | 'warehouse'
  | 'director';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [{ resource: '*', action: 'manage' }],

  sales_manager: [
    { resource: 'orders', action: 'create' },
    { resource: 'orders', action: 'read' },
    { resource: 'orders', action: 'update' },
    { resource: 'customers', action: 'create' },
    { resource: 'customers', action: 'read' },
    { resource: 'customers', action: 'update' },
    { resource: 'imports', action: 'create' },
    { resource: 'imports', action: 'read' },
    { resource: 'preview', action: 'read' },
  ],

  designer: [
    { resource: 'designs', action: 'create' },
    { resource: 'designs', action: 'read' },
    { resource: 'designs', action: 'update' },
    { resource: 'designs', action: 'delete' },
    { resource: 'element_types', action: 'create' },
    { resource: 'element_types', action: 'read' },
    { resource: 'element_types', action: 'update' },
    { resource: 'preview', action: 'create' },
    { resource: 'preview', action: 'read' },
  ],

  technologist: [
    { resource: 'materials', action: 'create' },
    { resource: 'materials', action: 'read' },
    { resource: 'materials', action: 'update' },
    { resource: 'coatings', action: 'create' },
    { resource: 'coatings', action: 'read' },
    { resource: 'coatings', action: 'update' },
    { resource: 'inventory', action: 'read' },
    { resource: 'inventory', action: 'update' },
  ],

  warehouse: [
    { resource: 'inventory', action: 'read' },
    { resource: 'inventory', action: 'update' },
    { resource: 'materials', action: 'read' },
    { resource: 'orders', action: 'read' },
  ],

  director: [
    { resource: 'reports', action: 'read' },
    { resource: 'reports', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'analytics', action: 'read' },
    { resource: 'orders', action: 'read' },
  ],
};

export function hasPermission(
  role: UserRole,
  resource: string,
  action: Permission['action']
): boolean {
  if (role === 'admin') return true;
  const permissions = rolePermissions[role];
  return permissions.some(
    (p) => (p.resource === resource || p.resource === '*') && p.action === action
  );
}

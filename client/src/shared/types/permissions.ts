export const ACCOUNT_TYPES = ['internal', 'partner', 'customer'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const PORTAL_ROLES = ['partner_admin', 'partner_user', 'partner_billing', 'customer_admin', 'customer_user'] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

export const PERMISSION_MODULES = [
  'contacts',
  'companies',
  'deals',
  'tickets',
  'invoices',
  'quotes',
  'licenses',
  'partnerships',
  'products',
  'payments',
  'creditMemos',
  'users',
] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const PERMISSION_SCOPES = ['none', 'own', 'all'] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export type PermissionSetModuleRow = {
  module: PermissionModule;
  viewScope: PermissionScope;
  canCreate: boolean;
  editScope: PermissionScope;
  deleteScope: PermissionScope;
  mergeScope: PermissionScope;
};

export type PermissionSet = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PermissionSetWithModules = PermissionSet & { modules: PermissionSetModuleRow[] };

export type PermissionSetModuleInput = Partial<Omit<PermissionSetModuleRow, 'module'>> & { module: PermissionModule };

export type CreatePermissionSetInput = {
  name: string;
  modules?: PermissionSetModuleInput[];
};

export type UpdatePermissionSetInput = {
  name?: string;
  modules?: PermissionSetModuleInput[];
};

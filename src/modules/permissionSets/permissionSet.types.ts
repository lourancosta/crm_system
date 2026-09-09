import { MODULES, type Module, type Scope } from '../../lib/permissions';

export { MODULES };
export type { Module, Scope };

export type PermissionSetModuleRow = {
  module: Module;
  viewScope: Scope;
  canCreate: boolean;
  editScope: Scope;
  deleteScope: Scope;
  mergeScope: Scope;
};

export type PermissionSet = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PermissionSetWithModules = PermissionSet & {
  modules: PermissionSetModuleRow[];
};

export type PermissionSetModuleInput = Partial<Omit<PermissionSetModuleRow, 'module'>> & { module: Module };

export type CreatePermissionSetInput = {
  name: string;
  modules?: PermissionSetModuleInput[];
};

export type UpdatePermissionSetInput = {
  name?: string;
  modules?: PermissionSetModuleInput[];
};

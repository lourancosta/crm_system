import { del, get, post, put } from '../../../../shared/api/client';
import type { CreatePermissionSetInput, PermissionSetWithModules, UpdatePermissionSetInput } from '../../../../shared/types/index';

export const permissionSetsApi = {
  list: () => get<PermissionSetWithModules[]>('/permission-sets'),
  getById: (id: string) => get<PermissionSetWithModules>(`/permission-sets/${id}`),
  create: (input: CreatePermissionSetInput) => post<PermissionSetWithModules>('/permission-sets', input),
  update: (id: string, input: UpdatePermissionSetInput) => put<PermissionSetWithModules>(`/permission-sets/${id}`, input),
  delete: (id: string) => del(`/permission-sets/${id}`),
};

import * as repo from './permissionSet.repository';
import type { CreatePermissionSetInput, UpdatePermissionSetInput } from './permissionSet.types';

function notFound() {
  const err = new Error('Permission set not found') as Error & { statusCode?: number };
  err.statusCode = 404;
  return err;
}

function inUse() {
  const err = new Error('Cannot delete a permission set that is assigned to one or more users') as Error & {
    statusCode?: number;
  };
  err.statusCode = 409;
  return err;
}

export const listPermissionSets = () => repo.findAll();

export async function getPermissionSet(id: string) {
  const set = await repo.findById(id);
  if (!set) throw notFound();
  return set;
}

export const createPermissionSet = (input: CreatePermissionSetInput) => repo.create(input);

export async function updatePermissionSet(id: string, input: UpdatePermissionSetInput) {
  const set = await repo.update(id, input);
  if (!set) throw notFound();
  return set;
}

export async function deletePermissionSet(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw notFound();
  if (await repo.isAssignedToAnyUser(id)) throw inUse();
  await repo.remove(id);
}

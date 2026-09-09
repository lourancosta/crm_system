import { randomUUID } from 'crypto';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client';
import { permissionSet, permissionSetModule, users } from '../../db/schema';
import { MODULES, NO_ACCESS } from '../../lib/permissions';
import type {
  CreatePermissionSetInput,
  PermissionSetModuleInput,
  PermissionSetModuleRow,
  PermissionSetWithModules,
  UpdatePermissionSetInput,
} from './permissionSet.types';

async function attachModules(sets: (typeof permissionSet.$inferSelect)[]): Promise<PermissionSetWithModules[]> {
  if (sets.length === 0) return [];
  const rows = await db
    .select()
    .from(permissionSetModule)
    .where(inArray(permissionSetModule.permissionSetId, sets.map((s) => s.id)));

  return sets.map((set) => ({
    ...set,
    modules: rows
      .filter((r) => r.permissionSetId === set.id)
      .map((r): PermissionSetModuleRow => ({
        module: r.module as PermissionSetModuleRow['module'],
        viewScope: r.viewScope as PermissionSetModuleRow['viewScope'],
        canCreate: r.canCreate,
        editScope: r.editScope as PermissionSetModuleRow['editScope'],
        deleteScope: r.deleteScope as PermissionSetModuleRow['deleteScope'],
        mergeScope: r.mergeScope as PermissionSetModuleRow['mergeScope'],
      })),
  }));
}

export async function findAll(): Promise<PermissionSetWithModules[]> {
  const sets = await db.select().from(permissionSet).orderBy(asc(permissionSet.name));
  return attachModules(sets);
}

export async function findById(id: string): Promise<PermissionSetWithModules | null> {
  const rows = await db.select().from(permissionSet).where(eq(permissionSet.id, id)).limit(1);
  if (!rows[0]) return null;
  return (await attachModules(rows))[0];
}

async function upsertModuleRows(permissionSetId: string, modules: PermissionSetModuleInput[]) {
  for (const m of modules) {
    // No RETURNING/onConflictDoUpdate under MySQL — look up the existing row
    // for this (permissionSetId, module) pair explicitly and branch between
    // update and insert, preserving the same upsert semantics.
    const existing = await db
      .select({ id: permissionSetModule.id })
      .from(permissionSetModule)
      .where(and(eq(permissionSetModule.permissionSetId, permissionSetId), eq(permissionSetModule.module, m.module)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(permissionSetModule)
        .set({
          ...(m.viewScope !== undefined ? { viewScope: m.viewScope } : {}),
          ...(m.canCreate !== undefined ? { canCreate: m.canCreate } : {}),
          ...(m.editScope !== undefined ? { editScope: m.editScope } : {}),
          ...(m.deleteScope !== undefined ? { deleteScope: m.deleteScope } : {}),
          ...(m.mergeScope !== undefined ? { mergeScope: m.mergeScope } : {}),
          updatedAt: new Date(),
        })
        .where(eq(permissionSetModule.id, existing[0].id));
    } else {
      await db.insert(permissionSetModule).values({
        id: randomUUID(),
        permissionSetId,
        module: m.module,
        viewScope: m.viewScope ?? NO_ACCESS.view,
        canCreate: m.canCreate ?? NO_ACCESS.create,
        editScope: m.editScope ?? NO_ACCESS.edit,
        deleteScope: m.deleteScope ?? NO_ACCESS.delete,
        mergeScope: m.mergeScope ?? NO_ACCESS.merge,
      });
    }
  }
}

export async function create(input: CreatePermissionSetInput): Promise<PermissionSetWithModules> {
  const id = randomUUID();
  await db.insert(permissionSet).values({ id, name: input.name });
  const rows = await db.select().from(permissionSet).where(eq(permissionSet.id, id)).limit(1);
  const set = rows[0];

  // Every module gets a row (defaulting to no access) so the admin UI always
  // has something to render/toggle, even for modules the creator didn't touch.
  const provided = new Map((input.modules ?? []).map((m) => [m.module, m]));
  const allModules: PermissionSetModuleInput[] = MODULES.map((module) => provided.get(module) ?? { module });
  await upsertModuleRows(set.id, allModules);

  return (await findById(set.id))!;
}

export async function update(id: string, input: UpdatePermissionSetInput): Promise<PermissionSetWithModules | null> {
  const existing = await findById(id);
  if (!existing) return null;

  if (input.name !== undefined) {
    await db.update(permissionSet).set({ name: input.name, updatedAt: new Date() }).where(eq(permissionSet.id, id));
  }
  if (input.modules && input.modules.length > 0) {
    await upsertModuleRows(id, input.modules);
  }
  return findById(id);
}

export async function isAssignedToAnyUser(id: string): Promise<boolean> {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.permissionSetId, id)).limit(1);
  return rows.length > 0;
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await db.delete(permissionSet).where(eq(permissionSet.id, id));
  return result.affectedRows > 0;
}

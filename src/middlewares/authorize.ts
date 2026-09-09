import type { Request, Response, NextFunction } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { permissionSetModule, users } from '../db/schema';
import { getPortalPermission, NO_ACCESS } from '../lib/permissions';
import type { Module, ModulePermission } from '../lib/permissions';

function forbidden(message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 403;
  return error;
}

// System-config modules (pipelines, email accounts/templates, support
// inboxes, reminder rules, dashboard, history, KB content management) have no
// partner/customer story at all — internal-only, full stop.
export function requireInternal(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.accountType !== 'internal') return next(forbidden('Internal access only'));
  next();
}

// Looked up per request (not embedded in the JWT) so an admin editing a
// permission set takes effect immediately, without forcing re-login.
export async function getInternalGrant(userId: string, module: Module): Promise<{ permission: ModulePermission; hubspotOwnerId: string | null }> {
  const rows = await db
    .select({
      hubspotOwnerId: users.hubspotOwnerId,
      viewScope: permissionSetModule.viewScope,
      canCreate: permissionSetModule.canCreate,
      editScope: permissionSetModule.editScope,
      deleteScope: permissionSetModule.deleteScope,
      mergeScope: permissionSetModule.mergeScope,
    })
    .from(users)
    .innerJoin(
      permissionSetModule,
      and(eq(permissionSetModule.permissionSetId, users.permissionSetId), eq(permissionSetModule.module, module)),
    )
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row) return { permission: NO_ACCESS, hubspotOwnerId: null };
  return {
    hubspotOwnerId: row.hubspotOwnerId,
    permission: {
      view: row.viewScope as ModulePermission['view'],
      create: row.canCreate,
      edit: row.editScope as ModulePermission['edit'],
      delete: row.deleteScope as ModulePermission['delete'],
      merge: row.mergeScope as ModulePermission['merge'],
    },
  };
}

// Resolves the caller's grant for `module` (DB-backed permission set for
// internal, hardcoded PORTAL_ROLE_PERMISSIONS for partner/customer) without
// enforcing anything — used by requireModule for the single-module case, and
// by the global search endpoint to resolve several modules' grants in one
// request (there's no single "search everything" permission, so each type is
// resolved and silently omitted if the caller can't view it at all).
export async function resolveModuleGrant(
  req: Request,
  module: Module,
): Promise<{ permission: ModulePermission; ownerKey: string | null }> {
  if (!req.user) return { permission: NO_ACCESS, ownerKey: null };
  if (req.user.accountType === 'internal') {
    const grant = await getInternalGrant(req.user.userId, module);
    return { permission: grant.permission, ownerKey: grant.hubspotOwnerId };
  }
  return { permission: getPortalPermission(req.user.role, module), ownerKey: req.user.userId };
}

// Resolves the caller's grant for `module`, 403s if `action` isn't granted,
// and attaches req.scope for the controller/service to filter with.
export function requireModule(module: Module, action: 'view' | 'create' | 'edit' | 'delete') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(forbidden('Authentication required'));

      const { permission, ownerKey } = await resolveModuleGrant(req, module);

      const granted = action === 'create' ? permission.create : permission[action] !== 'none';
      if (!granted) return next(forbidden(`Not permitted to ${action} ${module}`));

      req.scope = { ...permission, ownerKey };
      next();
    } catch (error) {
      next(error);
    }
  };
}

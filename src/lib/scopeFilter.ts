// Shared helper turning a resolved req.scope + req.user into a concrete
// row-level filter repositories can drop into an existing `and(...)` where
// clause, without restructuring their query into a join. Used by every
// "record" module (deals, tickets, invoices, contacts, companies, ...).
import { eq, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { company } from '../db/schema';
import type { AccountType, ModulePermission } from './permissions';

export type RecordAccessScope =
  | { kind: 'own-internal'; hubspotOwnerId: string }
  | { kind: 'own-portal'; userId: string }
  | { kind: 'company'; companyHubspotId: string }
  | { kind: 'unresolvable' }; // 'own'/'company' requested but nothing to match against — fail closed, not open.

export async function resolveCompanyHubspotId(companyId: string | null): Promise<string | null> {
  if (!companyId) return null;
  const rows = await db.select({ hubspotId: company.hubspotId }).from(company).where(eq(company.id, companyId)).limit(1);
  return rows[0]?.hubspotId ?? null;
}

// Called once per request after requireModule has attached req.scope.
// `action` picks which of view/edit/delete's scope to resolve (view for
// list/get routes, edit/delete for mutation routes).
export async function resolveAccessScope(params: {
  accountType: AccountType;
  companyId: string | null;
  grant: ModulePermission;
  ownerKey: string | null;
  action: 'view' | 'edit' | 'delete';
}): Promise<RecordAccessScope | undefined> {
  const scope = params.grant[params.action];
  if (scope === 'none') return { kind: 'unresolvable' }; // middleware already 403s create/blanket-none; this covers e.g. edit when only view was granted
  if (scope === 'all' && params.accountType === 'internal') return undefined; // no filter

  if (scope === 'own') {
    if (!params.ownerKey) return { kind: 'unresolvable' };
    return params.accountType === 'internal'
      ? { kind: 'own-internal', hubspotOwnerId: params.ownerKey }
      : { kind: 'own-portal', userId: params.ownerKey };
  }

  // scope === 'all' for a partner/customer caller → their whole company.
  const companyHubspotId = await resolveCompanyHubspotId(params.companyId);
  if (!companyHubspotId) return { kind: 'unresolvable' };
  return { kind: 'company', companyHubspotId };
}

// EXISTS-based association check — composes as a plain boolean condition
// inside an existing and(...) where clause (mirrors the join shape already
// used by e.g. deal.repository.ts's findAssociatedCompanies, just scoped to
// one specific company instead of returning every associated company).
export function companyAssociationExists(objectType: string, recordHubspotIdColumn: unknown, companyHubspotId: string): SQL {
  return sql`EXISTS (
    SELECT 1 FROM dynamic_associations da
    WHERE da.from_object_type = ${objectType}
      AND da.from_hubspot_id = ${recordHubspotIdColumn}
      AND da.to_object_type = 'companies'
      AND da.to_hubspot_id = ${companyHubspotId}
  )`;
}

// Builds the extra WHERE condition for a given scope, or `undefined` when
// the internal caller has unrestricted ('all') access — i.e. today's
// behavior, unchanged.
export function scopeCondition(
  scope: RecordAccessScope | undefined,
  objectType: string,
  columns: { hubspotId: unknown; hubspotOwnerId: unknown; createdByUserId?: unknown },
): SQL | undefined {
  if (!scope) return undefined;
  switch (scope.kind) {
    case 'unresolvable':
      return sql`false`;
    case 'own-internal':
      return eq(columns.hubspotOwnerId as any, scope.hubspotOwnerId);
    case 'own-portal':
      return columns.createdByUserId ? eq(columns.createdByUserId as any, scope.userId) : sql`false`;
    case 'company':
      return companyAssociationExists(objectType, columns.hubspotId, scope.companyHubspotId);
  }
}

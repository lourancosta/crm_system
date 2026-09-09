import { randomUUID } from 'crypto';
import { and, count, eq, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import { ilike } from '../../lib/sqlHelpers';
import { db } from '../../db/client';
import { product } from '../../db/schema';
import { scopeCondition, type RecordAccessScope } from '../../lib/scopeFilter';
import type { CreateProductInput, PaginatedResult, ProductRecord, UpdateProductInput } from './product.types';

const productColumns = { hubspotId: product.hubspotId, hubspotOwnerId: product.hubspotOwnerId };

export type ProductTypeFilter = 'single' | 'bundle';

// HubSpot's own bundle marker: hs_bundle_type is unset/'none' for every
// regular product, and only a real bundle-config value otherwise. No bundle
// creation flow exists yet (see product.routes.ts's create — bundles are a
// future feature), so the "bundle" filter legitimately returns nothing today;
// this is groundwork for once bundles start getting created/synced.
function productTypeCondition(type?: ProductTypeFilter) {
  if (type === 'bundle') {
    return and(isNotNull(product.hsBundleType), ne(product.hsBundleType, ''), ne(product.hsBundleType, 'none'));
  }
  if (type === 'single') {
    return or(isNull(product.hsBundleType), eq(product.hsBundleType, ''), eq(product.hsBundleType, 'none'));
  }
  return undefined;
}

export async function findAll(
  page: number,
  limit: number,
  search?: string,
  scope?: RecordAccessScope,
  type?: ProductTypeFilter,
): Promise<PaginatedResult<ProductRecord>> {
  const where = and(
    eq(product.archived, false),
    search
      ? or(ilike(product.name, `%${search}%`), ilike(product.description, `%${search}%`))
      : undefined,
    scopeCondition(scope, 'products', productColumns),
    productTypeCondition(type),
  );

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(product)
      .where(where)
      .orderBy(sql`(${product.name} IS NULL), ${product.name} ASC`)
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(product).where(where),
  ]);

  return { data, total: Number(countResult[0].count), page, limit };
}

export async function findById(id: string, scope?: RecordAccessScope): Promise<ProductRecord | null> {
  const rows = await db
    .select()
    .from(product)
    .where(and(eq(product.id, id), eq(product.archived, false), scopeCondition(scope, 'products', productColumns)))
    .limit(1);
  return rows[0] ?? null;
}

// Resolves a product from a line item's hsProductId (a copy of the product's
// own hsObjectId, taken at line-item creation time) — used by invoice cloning
// to re-derive which product a source line item came from.
export async function findByHsObjectId(hsObjectId: string): Promise<ProductRecord | null> {
  const rows = await db
    .select()
    .from(product)
    .where(and(eq(product.hsObjectId, hsObjectId), eq(product.archived, false)))
    .limit(1);
  return rows[0] ?? null;
}

// Fallback for invoice cloning when a line item has no hsProductId at all —
// true for a large share of line items synced from HubSpot in bulk before
// this app tracked per-item product associations (hsProductId was simply
// never populated for that batch, regardless of whether the product still
// exists). Exact, case-insensitive match on the active product catalog,
// which has no duplicate names, so this is unambiguous.
export async function findByName(name: string): Promise<ProductRecord | null> {
  const rows = await db
    .select()
    .from(product)
    .where(and(ilike(product.name, name), eq(product.archived, false)))
    .limit(1);
  return rows[0] ?? null;
}

export async function create(input: CreateProductInput): Promise<ProductRecord> {
  const id = randomUUID();
  await db
    .insert(product)
    .values({ id, ...input, archived: false });
  const rows = await db.select().from(product).where(eq(product.id, id)).limit(1);
  return rows[0];
}

export async function update(id: string, input: UpdateProductInput, scope?: RecordAccessScope): Promise<ProductRecord | null> {
  const where = and(eq(product.id, id), scopeCondition(scope, 'products', productColumns));
  await db
    .update(product)
    .set({ ...input, updatedAt: new Date() })
    .where(where);
  const rows = await db.select().from(product).where(where).limit(1);
  return rows[0] ?? null;
}

export async function remove(id: string, scope?: RecordAccessScope): Promise<boolean> {
  const [result] = await db
    .update(product)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(product.id, id), scopeCondition(scope, 'products', productColumns)));
  return result.affectedRows > 0;
}

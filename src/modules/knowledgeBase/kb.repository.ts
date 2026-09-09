import { randomUUID } from 'crypto';
import { and, asc, count, desc, eq, inArray, or } from 'drizzle-orm';
import { ilike } from '../../lib/sqlHelpers';
import { sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { kbArticle, kbCategory, kbSubcategory } from '../../db/schema';
import { canViewKbTier } from '../../lib/permissions';
import type {
  ArticleLanguageVariant,
  CreateArticleInput,
  CreateCategoryInput,
  CreateSubcategoryInput,
  KbArticle,
  KbArticleSearchResult,
  KbArticleSummary,
  KbTier,
  KbCategory,
  KbCategoryWithSubcategories,
  KbSubcategory,
  ListArticlesFilter,
  PaginatedResult,
  UpdateArticleInput,
  UpdateCategoryInput,
  UpdateSubcategoryInput,
} from './kb.types';

function toCategory(row: typeof kbCategory.$inferSelect): KbCategory {
  return row;
}

function toArticle(row: typeof kbArticle.$inferSelect): KbArticle {
  return { ...row, visibility: row.visibility as KbTier };
}

export async function findAllCategories(): Promise<KbCategoryWithSubcategories[]> {
  const categories = await db.select().from(kbCategory).orderBy(asc(kbCategory.sortOrder));
  if (categories.length === 0) return [];

  const subcats = await db
    .select()
    .from(kbSubcategory)
    .where(inArray(kbSubcategory.categoryId, categories.map((c) => c.id)))
    .orderBy(asc(kbSubcategory.sortOrder));

  return categories.map((c) => ({
    ...toCategory(c),
    subcategories: subcats.filter((s) => s.categoryId === c.id),
  }));
}

export async function findCategoryById(id: string): Promise<KbCategoryWithSubcategories | null> {
  const rows = await db.select().from(kbCategory).where(eq(kbCategory.id, id)).limit(1);
  const found = rows[0];
  if (!found) return null;
  const subcategories = await db
    .select()
    .from(kbSubcategory)
    .where(eq(kbSubcategory.categoryId, id))
    .orderBy(asc(kbSubcategory.sortOrder));
  return { ...toCategory(found), subcategories };
}

export async function findCategoryBySlug(slug: string): Promise<KbCategory | null> {
  const rows = await db.select().from(kbCategory).where(eq(kbCategory.slug, slug)).limit(1);
  return rows[0] ? toCategory(rows[0]) : null;
}

export async function createCategory(input: CreateCategoryInput): Promise<KbCategory> {
  const maxRow = await db.select({ max: sql<number>`coalesce(max(${kbCategory.sortOrder}), -1)` }).from(kbCategory);
  const sortOrder = Number(maxRow[0]?.max ?? -1) + 1;
  const id = randomUUID();
  await db
    .insert(kbCategory)
    .values({ id, ...input, sortOrder });
  const rows = await db.select().from(kbCategory).where(eq(kbCategory.id, id)).limit(1);
  return toCategory(rows[0]);
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<KbCategory | null> {
  await db
    .update(kbCategory)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(kbCategory.id, id));
  const rows = await db.select().from(kbCategory).where(eq(kbCategory.id, id)).limit(1);
  return rows[0] ? toCategory(rows[0]) : null;
}

export async function removeCategory(id: string): Promise<boolean> {
  const [result] = await db.delete(kbCategory).where(eq(kbCategory.id, id));
  return result.affectedRows > 0;
}

export async function reorderCategories(categoryIds: string[]): Promise<void> {
  await Promise.all(
    categoryIds.map((id, index) =>
      db.update(kbCategory).set({ sortOrder: index, updatedAt: new Date() }).where(eq(kbCategory.id, id)),
    ),
  );
}

export async function createSubcategory(categoryId: string, input: CreateSubcategoryInput): Promise<KbSubcategory> {
  const maxRow = await db
    .select({ max: sql<number>`coalesce(max(${kbSubcategory.sortOrder}), -1)` })
    .from(kbSubcategory)
    .where(eq(kbSubcategory.categoryId, categoryId));
  const sortOrder = Number(maxRow[0]?.max ?? -1) + 1;
  const id = randomUUID();
  await db
    .insert(kbSubcategory)
    .values({ id, ...input, categoryId, sortOrder });
  const rows = await db.select().from(kbSubcategory).where(eq(kbSubcategory.id, id)).limit(1);
  return rows[0];
}

export async function findSubcategoryBySlug(categoryId: string, slug: string): Promise<KbSubcategory | null> {
  const rows = await db
    .select()
    .from(kbSubcategory)
    .where(and(eq(kbSubcategory.categoryId, categoryId), eq(kbSubcategory.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateSubcategory(id: string, input: UpdateSubcategoryInput): Promise<KbSubcategory | null> {
  await db
    .update(kbSubcategory)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(kbSubcategory.id, id));
  const rows = await db.select().from(kbSubcategory).where(eq(kbSubcategory.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function removeSubcategory(id: string): Promise<boolean> {
  const [result] = await db.delete(kbSubcategory).where(eq(kbSubcategory.id, id));
  return result.affectedRows > 0;
}

export async function reorderSubcategories(categoryId: string, subcategoryIds: string[]): Promise<void> {
  await Promise.all(
    subcategoryIds.map((id, index) =>
      db
        .update(kbSubcategory)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(and(eq(kbSubcategory.id, id), eq(kbSubcategory.categoryId, categoryId))),
    ),
  );
}

export async function findAllArticles(filter: ListArticlesFilter): Promise<PaginatedResult<KbArticleSummary>> {
  const where = and(
    filter.search ? ilike(kbArticle.title, `%${filter.search}%`) : undefined,
    filter.categoryId ? eq(kbArticle.categoryId, filter.categoryId) : undefined,
    filter.subcategoryId ? eq(kbArticle.subcategoryId, filter.subcategoryId) : undefined,
    filter.language ? eq(kbArticle.language, filter.language) : undefined,
    filter.status ? eq(kbArticle.status, filter.status) : undefined,
  );

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: kbArticle.id,
        categoryId: kbArticle.categoryId,
        subcategoryId: kbArticle.subcategoryId,
        slug: kbArticle.slug,
        language: kbArticle.language,
        title: kbArticle.title,
        status: kbArticle.status,
        visibility: kbArticle.visibility,
        translationGroupId: kbArticle.translationGroupId,
        updatedAt: kbArticle.updatedAt,
      })
      .from(kbArticle)
      .where(where)
      .orderBy(desc(kbArticle.updatedAt))
      .limit(filter.limit)
      .offset((filter.page - 1) * filter.limit),
    db.select({ count: count() }).from(kbArticle).where(where),
  ]);

  return {
    data: data.map((d) => ({ ...d, visibility: d.visibility as KbTier })),
    total: Number(countResult[0].count),
    page: filter.page,
    limit: filter.limit,
  };
}

export async function findArticleById(id: string): Promise<KbArticle | null> {
  const rows = await db.select().from(kbArticle).where(eq(kbArticle.id, id)).limit(1);
  return rows[0] ? toArticle(rows[0]) : null;
}

export async function createArticle(input: CreateArticleInput): Promise<KbArticle> {
  const id = randomUUID();
  await db.insert(kbArticle).values({ id, ...input });
  const rows = await db.select().from(kbArticle).where(eq(kbArticle.id, id)).limit(1);
  return toArticle(rows[0]);
}

export async function updateArticle(id: string, input: UpdateArticleInput): Promise<KbArticle | null> {
  await db
    .update(kbArticle)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(kbArticle.id, id));
  const rows = await db.select().from(kbArticle).where(eq(kbArticle.id, id)).limit(1);
  return rows[0] ? toArticle(rows[0]) : null;
}

export async function removeArticle(id: string): Promise<boolean> {
  const [result] = await db.delete(kbArticle).where(eq(kbArticle.id, id));
  return result.affectedRows > 0;
}

// Deliberately narrow (not folded into the general updateArticle/
// UpdateArticleInput path) - translationGroupId is only ever set by
// kb.service.ts's groupArticleWith, never directly by the article edit form.
export async function setArticleTranslationGroup(id: string, translationGroupId: string | null): Promise<KbArticle | null> {
  await db
    .update(kbArticle)
    .set({ translationGroupId, updatedAt: new Date() })
    .where(eq(kbArticle.id, id));
  const rows = await db.select().from(kbArticle).where(eq(kbArticle.id, id)).limit(1);
  return rows[0] ? toArticle(rows[0]) : null;
}

// Categories have no visibility tier of their own - a category is shown to a
// given tier iff it has at least one published article that tier can see.
// Browsing into the category then filters its article list the same way
// (see findPublishedArticlesForSubcategory), so a mixed-visibility category
// only ever exposes the subset the caller is allowed to view.
export async function findPublicCategories(
  audience?: string,
  language?: string,
): Promise<KbCategoryWithSubcategories[]> {
  const tier = (audience ?? 'public') as KbTier;
  const all = await findAllCategories();

  const publishedArticles = await db
    .select({ categoryId: kbArticle.categoryId, visibility: kbArticle.visibility, language: kbArticle.language })
    .from(kbArticle)
    .where(eq(kbArticle.status, 'published'));

  const visibleCategoryIds = new Set(
    publishedArticles
      .filter((a) => canViewKbTier(tier, a.visibility as KbTier) && (!language || a.language === language))
      .map((a) => a.categoryId),
  );

  return all.filter((c) => visibleCategoryIds.has(c.id));
}

export async function findPublishedArticlesForSubcategory(
  subcategoryId: string,
  audience?: string,
  language?: string,
): Promise<KbArticle[]> {
  const rows = await db
    .select()
    .from(kbArticle)
    .where(
      and(
        eq(kbArticle.subcategoryId, subcategoryId),
        eq(kbArticle.status, 'published'),
        language ? eq(kbArticle.language, language) : undefined,
      ),
    )
    .orderBy(asc(kbArticle.title));
  const mapped = rows.map(toArticle);
  return audience ? mapped.filter((a) => canViewKbTier(audience as KbTier, a.visibility)) : mapped;
}

// Each published article now owns its URL outright (grouping no longer
// forces siblings to share a slug/category/subcategory), so a path is
// resolved without filtering by language. language narrows the result only
// on the rare case where two unrelated articles collide on the same path.
export async function findPublishedArticleBySlug(
  subcategoryId: string,
  slug: string,
  language?: string,
): Promise<KbArticle | null> {
  const rows = await db
    .select()
    .from(kbArticle)
    .where(
      and(
        eq(kbArticle.subcategoryId, subcategoryId),
        eq(kbArticle.slug, slug),
        eq(kbArticle.status, 'published'),
      ),
    );
  if (rows.length === 0) return null;
  const match = language ? rows.find((r) => r.language === language) : undefined;
  return toArticle(match ?? rows[0]);
}

export async function searchPublishedArticles(
  query: string,
  tier: KbTier,
  language?: string,
): Promise<KbArticleSearchResult[]> {
  const rows = await db
    .select({
      id: kbArticle.id,
      categoryId: kbArticle.categoryId,
      subcategoryId: kbArticle.subcategoryId,
      slug: kbArticle.slug,
      language: kbArticle.language,
      title: kbArticle.title,
      subtitle: kbArticle.subtitle,
      visibility: kbArticle.visibility,
    })
    .from(kbArticle)
    .where(
      and(
        eq(kbArticle.status, 'published'),
        language ? eq(kbArticle.language, language) : undefined,
        or(ilike(kbArticle.title, `%${query}%`), ilike(kbArticle.subtitle, `%${query}%`)),
      ),
    )
    .orderBy(asc(kbArticle.title))
    .limit(20);

  return rows
    .filter((a) => canViewKbTier(tier, a.visibility as KbTier))
    .map(({ visibility, ...rest }) => rest);
}

// Every published sibling in an article's translation group, each with its
// own full path - a variant's category/subcategory/slug are independent from
// the others', so the caller needs the whole path to link to it (not just a
// language code toggled onto the current URL, per the old slug-matching
// design this replaced).
export async function findArticleLanguageVariants(translationGroupId: string): Promise<ArticleLanguageVariant[]> {
  const rows = await db
    .select({
      language: kbArticle.language,
      articleSlug: kbArticle.slug,
      categorySlug: kbCategory.slug,
      subcategorySlug: kbSubcategory.slug,
    })
    .from(kbArticle)
    .innerJoin(kbCategory, eq(kbCategory.id, kbArticle.categoryId))
    .innerJoin(kbSubcategory, eq(kbSubcategory.id, kbArticle.subcategoryId))
    .where(and(eq(kbArticle.translationGroupId, translationGroupId), eq(kbArticle.status, 'published')));
  return rows;
}

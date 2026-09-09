import { z } from 'zod';
import { KB_ARTICLE_STATUSES, KB_LANGUAGES, KB_TIERS } from './kb.types';

const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only');

export const kbIdParamsSchema = z.object({ id: z.string().uuid() });
export const kbSubcategoryIdParamsSchema = z.object({
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid(),
});

export const createCategorySchema = z.object({
  slug: slugSchema,
  title: z.string().min(1, 'Title is required'),
  translations: z.record(z.enum(KB_LANGUAGES), z.string()).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const reorderCategoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid()).min(1),
});

export const createSubcategorySchema = z.object({
  slug: slugSchema,
  title: z.string().min(1, 'Title is required'),
  translations: z.record(z.enum(KB_LANGUAGES), z.string()).optional(),
});

export const updateSubcategorySchema = createSubcategorySchema.partial();

export const reorderSubcategoriesSchema = z.object({
  subcategoryIds: z.array(z.string().uuid()).min(1),
});

export const createArticleSchema = z.object({
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid(),
  slug: slugSchema,
  language: z.enum(KB_LANGUAGES).default('en'),
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  content: z.string().default(''),
  visibility: z.enum(KB_TIERS).default('internal'),
  status: z.enum(KB_ARTICLE_STATUSES).default('draft'),
});

export const updateArticleSchema = createArticleSchema.partial();

export const groupArticleSchema = z.object({
  targetArticleId: z.string().uuid(),
});

export const listArticlesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  language: z.enum(KB_LANGUAGES).optional(),
  status: z.enum(KB_ARTICLE_STATUSES).optional(),
});

// 'support' is the old tag value external partner/support portals may still
// send — it mapped to the new 'customer' tier during the audiences->visibility
// migration (see the backfill migration), so it's kept as an accepted alias
// here rather than breaking those callers' existing ?audience=support calls.
const audienceQuerySchema = z
  .enum([...KB_TIERS, 'support'])
  .transform((v) => (v === 'support' ? 'customer' : v));

export const publicCategoriesQuerySchema = z.object({
  audience: audienceQuerySchema.optional(),
  language: z.enum(KB_LANGUAGES).optional(),
});

export const publicCategoryParamsSchema = z.object({
  categorySlug: z.string(),
});

export const publicArticleParamsSchema = z.object({
  categorySlug: z.string(),
  subcategorySlug: z.string(),
  articleSlug: z.string(),
});

export const publicArticleQuerySchema = z.object({
  language: z.enum(KB_LANGUAGES).optional(),
  audience: audienceQuerySchema.optional(),
});

export const publicSearchQuerySchema = z.object({
  q: z.string().trim().min(1),
  language: z.enum(KB_LANGUAGES).optional(),
  audience: audienceQuerySchema.optional(),
});

import { KB_TIERS, type KbTier } from '../../lib/permissions';

export { KB_TIERS };
export type { KbTier };

export const KB_LANGUAGES = ['en', 'pt', 'es'] as const;
export type KbLanguage = (typeof KB_LANGUAGES)[number];

export const KB_ARTICLE_STATUSES = ['draft', 'published'] as const;
export type KbArticleStatus = (typeof KB_ARTICLE_STATUSES)[number];

export type KbCategory = {
  id: string;
  slug: string;
  title: string;
  translations: Record<string, string> | null;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type KbSubcategory = {
  id: string;
  categoryId: string;
  slug: string;
  title: string;
  translations: Record<string, string> | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type KbCategoryWithSubcategories = KbCategory & { subcategories: KbSubcategory[] };

export type KbArticle = {
  id: string;
  categoryId: string;
  subcategoryId: string;
  slug: string;
  language: string;
  title: string;
  subtitle: string | null;
  content: string;
  visibility: KbTier;
  status: string;
  translationGroupId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type KbArticleSummary = {
  id: string;
  categoryId: string;
  subcategoryId: string;
  slug: string;
  language: string;
  title: string;
  status: string;
  visibility: KbTier;
  translationGroupId: string | null;
  updatedAt: Date;
};

export type CreateCategoryInput = {
  slug: string;
  title: string;
  translations?: Record<string, string>;
  description?: string;
  imageUrl?: string;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export type CreateSubcategoryInput = {
  slug: string;
  title: string;
  translations?: Record<string, string>;
};

export type UpdateSubcategoryInput = Partial<CreateSubcategoryInput>;

// Every language variant of a logical article - only meaningful when the
// article has a translationGroupId. Each variant keeps its own category/
// subcategory/slug now, so the public site needs the whole path (not just a
// language code) to link to a sibling.
export type ArticleLanguageVariant = {
  language: string;
  categorySlug: string;
  subcategorySlug: string;
  articleSlug: string;
};

export type CreateArticleInput = {
  categoryId: string;
  subcategoryId: string;
  slug: string;
  language: KbLanguage;
  title: string;
  subtitle?: string;
  content: string;
  visibility: KbTier;
  status: KbArticleStatus;
};

export type UpdateArticleInput = Partial<CreateArticleInput>;

export type KbArticleSearchResult = {
  id: string;
  categoryId: string;
  subcategoryId: string;
  slug: string;
  language: string;
  title: string;
  subtitle: string | null;
};

export type ListArticlesFilter = {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  subcategoryId?: string;
  language?: string;
  status?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

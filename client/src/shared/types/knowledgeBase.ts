export const KB_TIERS = ['public', 'customer', 'partner', 'internal'] as const;
export type KbTier = (typeof KB_TIERS)[number];

export const KB_LANGUAGES = ['en', 'pt', 'es'] as const;
export type KbLanguage = (typeof KB_LANGUAGES)[number];

export const KB_ARTICLE_STATUSES = ['draft', 'published'] as const;
export type KbArticleStatus = (typeof KB_ARTICLE_STATUSES)[number];

export type KbSubcategory = {
  id: string;
  categoryId: string;
  slug: string;
  title: string;
  translations: Record<string, string> | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type KbCategory = {
  id: string;
  slug: string;
  title: string;
  translations: Record<string, string> | null;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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
  updatedAt: string;
};

export type KbArticleSearchResult = {
  id: string;
  categoryId: string;
  subcategoryId: string;
  slug: string;
  language: string;
  title: string;
  subtitle: string | null;
};

export type CreateKbCategoryInput = {
  slug: string;
  title: string;
  translations?: Record<string, string>;
  description?: string;
  imageUrl?: string;
};

export type UpdateKbCategoryInput = Partial<CreateKbCategoryInput>;

export type CreateKbSubcategoryInput = {
  slug: string;
  title: string;
  translations?: Record<string, string>;
};

export type UpdateKbSubcategoryInput = Partial<CreateKbSubcategoryInput>;

export type KbArticleLanguageVariant = {
  language: string;
  categorySlug: string;
  subcategorySlug: string;
  articleSlug: string;
};

export type CreateKbArticleInput = {
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

export type UpdateKbArticleInput = Partial<CreateKbArticleInput>;

export type PublicKbSubcategoryWithArticles = KbSubcategory & { articles: KbArticle[] };

export type PublicKbCategoryPage = {
  category: KbCategory;
  subcategories: PublicKbSubcategoryWithArticles[];
};

export type PublicKbArticlePage = {
  category: KbCategory;
  subcategory: KbSubcategory;
  article: KbArticle;
  availableLanguages: KbArticleLanguageVariant[];
};

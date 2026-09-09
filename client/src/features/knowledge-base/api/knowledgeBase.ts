import { del, get, post, put } from '../../../shared/api/client';
import type {
  CreateKbArticleInput,
  CreateKbCategoryInput,
  CreateKbSubcategoryInput,
  KbArticle,
  KbArticleSearchResult,
  KbArticleSummary,
  KbCategory,
  KbCategoryWithSubcategories,
  KbSubcategory,
  PublicKbArticlePage,
  PublicKbCategoryPage,
  UpdateKbArticleInput,
  UpdateKbCategoryInput,
  UpdateKbSubcategoryInput,
} from '../../../shared/types/index';

export type PaginatedKbArticles = {
  data: KbArticleSummary[];
  total: number;
  page: number;
  limit: number;
};

export type ListArticlesParams = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  subcategoryId?: string;
  language?: string;
  status?: string;
};

async function uploadFile(file: File, visibility: string): Promise<{ url: string }> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('visibility', visibility);
  const response = await fetch('/api/knowledge-base/uploads', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await response.json().catch(() => ({ message: 'Upload failed' }));
  if (!response.ok) throw new Error(data.message ?? 'Upload failed');
  return data;
}

export const knowledgeBaseApi = {
  listCategories: () => get<KbCategoryWithSubcategories[]>('/knowledge-base/categories'),
  getCategory: (id: string) => get<KbCategoryWithSubcategories>(`/knowledge-base/categories/${id}`),
  createCategory: (input: CreateKbCategoryInput) => post<KbCategory>('/knowledge-base/categories', input),
  updateCategory: (id: string, input: UpdateKbCategoryInput) =>
    put<KbCategory>(`/knowledge-base/categories/${id}`, input),
  deleteCategory: (id: string) => del(`/knowledge-base/categories/${id}`),
  reorderCategories: (categoryIds: string[]) => put('/knowledge-base/categories/reorder', { categoryIds }),

  createSubcategory: (categoryId: string, input: CreateKbSubcategoryInput) =>
    post<KbSubcategory>(`/knowledge-base/categories/${categoryId}/subcategories`, input),
  updateSubcategory: (categoryId: string, subcategoryId: string, input: UpdateKbSubcategoryInput) =>
    put<KbSubcategory>(`/knowledge-base/categories/${categoryId}/subcategories/${subcategoryId}`, input),
  deleteSubcategory: (categoryId: string, subcategoryId: string) =>
    del(`/knowledge-base/categories/${categoryId}/subcategories/${subcategoryId}`),
  reorderSubcategories: (categoryId: string, subcategoryIds: string[]) =>
    put(`/knowledge-base/categories/${categoryId}/subcategories/reorder`, { subcategoryIds }),

  listArticles: (params: ListArticlesParams = {}) => {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.search) search.set('search', params.search);
    if (params.categoryId) search.set('categoryId', params.categoryId);
    if (params.subcategoryId) search.set('subcategoryId', params.subcategoryId);
    if (params.language) search.set('language', params.language);
    if (params.status) search.set('status', params.status);
    return get<PaginatedKbArticles>(`/knowledge-base/articles?${search}`);
  },
  getArticle: (id: string) => get<KbArticle>(`/knowledge-base/articles/${id}`),
  createArticle: (input: CreateKbArticleInput) => post<KbArticle>('/knowledge-base/articles', input),
  updateArticle: (id: string, input: UpdateKbArticleInput) => put<KbArticle>(`/knowledge-base/articles/${id}`, input),
  groupArticle: (id: string, targetArticleId: string) =>
    put<KbArticle>(`/knowledge-base/articles/${id}/group`, { targetArticleId }),
  ungroupArticle: (id: string) => put<KbArticle>(`/knowledge-base/articles/${id}/ungroup`, {}),
  deleteArticle: (id: string) => del(`/knowledge-base/articles/${id}`),

  uploadMedia: uploadFile,

  publicListCategories: (audience?: string, language?: string) => {
    const search = new URLSearchParams();
    if (audience) search.set('audience', audience);
    if (language) search.set('language', language);
    return get<KbCategoryWithSubcategories[]>(`/public/knowledge-base/categories?${search}`);
  },
  publicSearchArticles: (query: string, opts: { language?: string; audience?: string } = {}) => {
    const search = new URLSearchParams({ q: query });
    if (opts.language) search.set('language', opts.language);
    if (opts.audience) search.set('audience', opts.audience);
    return get<KbArticleSearchResult[]>(`/public/knowledge-base/search?${search}`);
  },
  publicGetCategoryPage: (categorySlug: string, audience?: string, language?: string) => {
    const search = new URLSearchParams();
    if (audience) search.set('audience', audience);
    if (language) search.set('language', language);
    return get<PublicKbCategoryPage>(`/public/knowledge-base/categories/${categorySlug}?${search}`);
  },
  publicGetArticle: (
    categorySlug: string,
    subcategorySlug: string,
    articleSlug: string,
    opts: { language?: string; audience?: string } = {},
  ) => {
    const search = new URLSearchParams();
    if (opts.language) search.set('language', opts.language);
    if (opts.audience) search.set('audience', opts.audience);
    return get<PublicKbArticlePage>(
      `/public/knowledge-base/categories/${categorySlug}/${subcategorySlug}/${articleSlug}?${search}`,
    );
  },
};

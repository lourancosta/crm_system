import { randomUUID } from 'crypto';
import * as repo from './kb.repository';
import { canViewKbTier } from '../../lib/permissions';
import type {
  CreateArticleInput,
  CreateCategoryInput,
  CreateSubcategoryInput,
  KbTier,
  ListArticlesFilter,
  UpdateArticleInput,
  UpdateCategoryInput,
  UpdateSubcategoryInput,
} from './kb.types';

function notFound(what: string) {
  const error = new Error(`${what} not found`) as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

export const listCategories = () => repo.findAllCategories();

export async function getCategory(id: string) {
  const category = await repo.findCategoryById(id);
  if (!category) throw notFound('Category');
  return category;
}

export const createCategory = (input: CreateCategoryInput) => repo.createCategory(input);

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const category = await repo.updateCategory(id, input);
  if (!category) throw notFound('Category');
  return category;
}

export async function deleteCategory(id: string) {
  const deleted = await repo.removeCategory(id);
  if (!deleted) throw notFound('Category');
}

export const reorderCategories = (categoryIds: string[]) => repo.reorderCategories(categoryIds);

export async function createSubcategory(categoryId: string, input: CreateSubcategoryInput) {
  const category = await repo.findCategoryById(categoryId);
  if (!category) throw notFound('Category');
  return repo.createSubcategory(categoryId, input);
}

export async function updateSubcategory(id: string, input: UpdateSubcategoryInput) {
  const subcategory = await repo.updateSubcategory(id, input);
  if (!subcategory) throw notFound('Subcategory');
  return subcategory;
}

export async function deleteSubcategory(id: string) {
  const deleted = await repo.removeSubcategory(id);
  if (!deleted) throw notFound('Subcategory');
}

export const reorderSubcategories = (categoryId: string, subcategoryIds: string[]) =>
  repo.reorderSubcategories(categoryId, subcategoryIds);

export const listArticles = (filter: ListArticlesFilter) => repo.findAllArticles(filter);

export async function getArticle(id: string) {
  const article = await repo.findArticleById(id);
  if (!article) throw notFound('Article');
  return article;
}

export const createArticle = (input: CreateArticleInput) => repo.createArticle(input);

export async function updateArticle(id: string, input: UpdateArticleInput) {
  const article = await repo.updateArticle(id, input);
  if (!article) throw notFound('Article');
  return article;
}

export async function deleteArticle(id: string) {
  const deleted = await repo.removeArticle(id);
  if (!deleted) throw notFound('Article');
}

function badRequest(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;
  return error;
}

// "Grouping" two articles means marking them as language variants of the
// same logical article - each keeps its own category/subcategory/slug (an
// EN and PT article can live in entirely different subcategories, and use
// kbSubcategory.translations if you want them to at least *display* under a
// shared name). All this does is give both articles the same
// translationGroupId - reusing whichever one either article already has, or
// minting a fresh one if neither does.
export async function groupArticleWith(articleId: string, targetArticleId: string) {
  if (articleId === targetArticleId) throw badRequest('An article cannot be grouped with itself');

  const article = await repo.findArticleById(articleId);
  if (!article) throw notFound('Article');

  const target = await repo.findArticleById(targetArticleId);
  if (!target) throw notFound('Target article');

  if (article.language === target.language) {
    throw badRequest('Can only group with an article in a different language');
  }

  const groupId = target.translationGroupId ?? article.translationGroupId ?? randomUUID();
  if (target.translationGroupId !== groupId) {
    await repo.setArticleTranslationGroup(target.id, groupId);
  }

  const updated = await repo.setArticleTranslationGroup(article.id, groupId);
  if (!updated) throw notFound('Article');
  return updated;
}

export async function ungroupArticle(articleId: string) {
  const updated = await repo.setArticleTranslationGroup(articleId, null);
  if (!updated) throw notFound('Article');
  return updated;
}

export const listPublicCategories = (audience?: string, language?: string) =>
  repo.findPublicCategories(audience, language);

export const searchPublicArticles = (query: string, tier: KbTier, language?: string) =>
  repo.searchPublishedArticles(query, tier, language);

export async function getPublicCategoryPage(categorySlug: string, audience?: string, language?: string) {
  const category = await repo.findCategoryBySlug(categorySlug);
  if (!category) throw notFound('Category');
  const full = await repo.findCategoryById(category.id);
  const subcategories = full?.subcategories ?? [];
  const withArticles = await Promise.all(
    subcategories.map(async (sub) => ({
      ...sub,
      articles: await repo.findPublishedArticlesForSubcategory(sub.id, audience, language),
    })),
  );
  return { category, subcategories: withArticles };
}

export async function getPublicArticle(
  categorySlug: string,
  subcategorySlug: string,
  articleSlug: string,
  language?: string,
  audience?: string,
) {
  const category = await repo.findCategoryBySlug(categorySlug);
  if (!category) throw notFound('Article');
  const subcategory = await repo.findSubcategoryBySlug(category.id, subcategorySlug);
  if (!subcategory) throw notFound('Article');

  const article = await repo.findPublishedArticleBySlug(subcategory.id, articleSlug, language);
  if (!article) throw notFound('Article');
  if (audience && !canViewKbTier(audience as KbTier, article.visibility)) throw notFound('Article');

  // Ungrouped articles still report themselves as their own sole "variant" -
  // keeps the shape consistent so the frontend doesn't need to special-case
  // articles with no translationGroupId.
  const availableLanguages = article.translationGroupId
    ? await repo.findArticleLanguageVariants(article.translationGroupId)
    : [{ language: article.language, categorySlug, subcategorySlug, articleSlug: article.slug }];
  return { category, subcategory, article, availableLanguages };
}

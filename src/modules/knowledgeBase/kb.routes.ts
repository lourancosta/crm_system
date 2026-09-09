import { Router } from 'express';
import {
  browseArticle,
  browseCategories,
  browseCategoryPage,
  createArticle,
  createCategory,
  createSubcategory,
  deleteArticle,
  deleteCategory,
  deleteSubcategory,
  getArticle,
  getCategory,
  groupArticle,
  listArticles,
  listCategories,
  reorderCategories,
  reorderSubcategories,
  ungroupArticle,
  updateArticle,
  updateCategory,
  updateSubcategory,
} from './kb.controller';
import { getKbMedia, uploadKbMedia, uploadMiddleware } from './kb.upload';

// Read-only, open to any authenticated login (internal/partner/customer) —
// mounted separately in app.ts, without requireInternal, unlike the rest of
// this router (content management, internal-only).
export const knowledgeBaseBrowseRoutes = Router();
// Streams private-bucket KB media (customer/partner/internal-tier images) -
// lives here rather than on the internal-only router below because any
// logged-in tier that can view the referencing article needs to load it too.
knowledgeBaseBrowseRoutes.get('/media/*', getKbMedia);
knowledgeBaseBrowseRoutes.get('/categories', browseCategories);
knowledgeBaseBrowseRoutes.get('/categories/:categorySlug', browseCategoryPage);
knowledgeBaseBrowseRoutes.get('/categories/:categorySlug/:subcategorySlug/:articleSlug', browseArticle);

export const knowledgeBaseRoutes = Router();

knowledgeBaseRoutes.post('/uploads', uploadMiddleware, uploadKbMedia);

knowledgeBaseRoutes.get('/categories', listCategories);
knowledgeBaseRoutes.post('/categories', createCategory);
knowledgeBaseRoutes.put('/categories/reorder', reorderCategories);
knowledgeBaseRoutes.get('/categories/:id', getCategory);
knowledgeBaseRoutes.put('/categories/:id', updateCategory);
knowledgeBaseRoutes.delete('/categories/:id', deleteCategory);

knowledgeBaseRoutes.post('/categories/:id/subcategories', createSubcategory);
knowledgeBaseRoutes.put('/categories/:id/subcategories/reorder', reorderSubcategories);
knowledgeBaseRoutes.put('/categories/:categoryId/subcategories/:subcategoryId', updateSubcategory);
knowledgeBaseRoutes.delete('/categories/:categoryId/subcategories/:subcategoryId', deleteSubcategory);

knowledgeBaseRoutes.get('/articles', listArticles);
knowledgeBaseRoutes.post('/articles', createArticle);
knowledgeBaseRoutes.get('/articles/:id', getArticle);
knowledgeBaseRoutes.put('/articles/:id', updateArticle);
knowledgeBaseRoutes.put('/articles/:id/group', groupArticle);
knowledgeBaseRoutes.put('/articles/:id/ungroup', ungroupArticle);
knowledgeBaseRoutes.delete('/articles/:id', deleteArticle);

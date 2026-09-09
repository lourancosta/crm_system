import type { NextFunction, Request, Response } from 'express';
import * as service from './kb.service';
import { kbTierForAccountType } from '../../lib/permissions';
import {
  createArticleSchema,
  createCategorySchema,
  createSubcategorySchema,
  groupArticleSchema,
  kbIdParamsSchema,
  kbSubcategoryIdParamsSchema,
  listArticlesQuerySchema,
  publicArticleParamsSchema,
  publicArticleQuerySchema,
  publicCategoriesQuerySchema,
  publicCategoryParamsSchema,
  reorderCategoriesSchema,
  reorderSubcategoriesSchema,
  updateArticleSchema,
  updateCategorySchema,
  updateSubcategorySchema,
} from './kb.schema';

export async function listCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listCategories());
  } catch (error) {
    next(error);
  }
}

export async function getCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = kbIdParamsSchema.parse(req.params);
    res.json(await service.getCategory(id));
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCategorySchema.parse(req.body);
    res.status(201).json(await service.createCategory(input));
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = kbIdParamsSchema.parse(req.params);
    const input = updateCategorySchema.parse(req.body);
    res.json(await service.updateCategory(id, input));
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = kbIdParamsSchema.parse(req.params);
    await service.deleteCategory(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function reorderCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const { categoryIds } = reorderCategoriesSchema.parse(req.body);
    await service.reorderCategories(categoryIds);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function createSubcategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = kbIdParamsSchema.parse(req.params);
    const input = createSubcategorySchema.parse(req.body);
    res.status(201).json(await service.createSubcategory(id, input));
  } catch (error) {
    next(error);
  }
}

export async function updateSubcategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { subcategoryId } = kbSubcategoryIdParamsSchema.parse(req.params);
    const input = updateSubcategorySchema.parse(req.body);
    res.json(await service.updateSubcategory(subcategoryId, input));
  } catch (error) {
    next(error);
  }
}

export async function deleteSubcategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { subcategoryId } = kbSubcategoryIdParamsSchema.parse(req.params);
    await service.deleteSubcategory(subcategoryId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function reorderSubcategories(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = kbIdParamsSchema.parse(req.params);
    const { subcategoryIds } = reorderSubcategoriesSchema.parse(req.body);
    await service.reorderSubcategories(id, subcategoryIds);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listArticles(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = listArticlesQuerySchema.parse(req.query);
    res.json(await service.listArticles(filter));
  } catch (error) {
    next(error);
  }
}

export async function getArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = kbIdParamsSchema.parse(req.params);
    res.json(await service.getArticle(id));
  } catch (error) {
    next(error);
  }
}

export async function createArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createArticleSchema.parse(req.body);
    res.status(201).json(await service.createArticle(input));
  } catch (error) {
    next(error);
  }
}

export async function updateArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = kbIdParamsSchema.parse(req.params);
    const input = updateArticleSchema.parse(req.body);
    res.json(await service.updateArticle(id, input));
  } catch (error) {
    next(error);
  }
}

export async function deleteArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = kbIdParamsSchema.parse(req.params);
    await service.deleteArticle(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function groupArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = kbIdParamsSchema.parse(req.params);
    const { targetArticleId } = groupArticleSchema.parse(req.body);
    res.json(await service.groupArticleWith(id, targetArticleId));
  } catch (error) {
    next(error);
  }
}

export async function ungroupArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = kbIdParamsSchema.parse(req.params);
    res.json(await service.ungroupArticle(id));
  } catch (error) {
    next(error);
  }
}

// Read-only KB access for any authenticated login (internal/partner/customer),
// filtered by the caller's own tier rather than a client-supplied query param
// — reuses the same public-portal service functions, just with a trusted tier.
export async function browseCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const { language } = publicCategoriesQuerySchema.parse(req.query);
    const tier = kbTierForAccountType(req.user?.accountType);
    res.json(await service.listPublicCategories(tier, language));
  } catch (error) {
    next(error);
  }
}

export async function browseCategoryPage(req: Request, res: Response, next: NextFunction) {
  try {
    const { categorySlug } = publicCategoryParamsSchema.parse(req.params);
    const { language } = publicCategoriesQuerySchema.parse(req.query);
    const tier = kbTierForAccountType(req.user?.accountType);
    res.json(await service.getPublicCategoryPage(categorySlug, tier, language));
  } catch (error) {
    next(error);
  }
}

export async function browseArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const { categorySlug, subcategorySlug, articleSlug } = publicArticleParamsSchema.parse(req.params);
    const { language } = publicArticleQuerySchema.parse(req.query);
    const tier = kbTierForAccountType(req.user?.accountType);
    res.json(await service.getPublicArticle(categorySlug, subcategorySlug, articleSlug, language, tier));
  } catch (error) {
    next(error);
  }
}

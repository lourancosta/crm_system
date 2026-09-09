import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import * as service from './kb.service';
import { KB_TIER_RANK, kbTierForAccountType, type KbTier } from '../../lib/permissions';
import {
  publicArticleParamsSchema,
  publicArticleQuerySchema,
  publicCategoriesQuerySchema,
  publicCategoryParamsSchema,
  publicSearchQuerySchema,
} from './kb.schema';

export const knowledgeBasePublicRoutes = Router();

// This router has no `authenticate` middleware - it's the truly anonymous
// entry point (public help-center links, outbound emails). It's mounted
// behind `optionalAuthenticate` in app.ts, which verifies a Bearer token when
// one is present without rejecting the request when it's absent.
//
// The caller's tier always comes from that verified token when present -
// never from client input, otherwise anyone could pass ?audience=internal
// with no login at all and read gated articles. The one exception: an
// anonymous caller (no token) may still ask for up to 'customer' tier via
// ?audience=, since that preserves an existing external support-portal
// integration that doesn't hold one of this app's own JWTs.
function resolveTier(req: Request, clientAudience?: KbTier): KbTier {
  if (req.user) return kbTierForAccountType(req.user.accountType);
  if (clientAudience && KB_TIER_RANK[clientAudience] <= KB_TIER_RANK.customer) return clientAudience;
  return 'public';
}

knowledgeBasePublicRoutes.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { audience, language } = publicCategoriesQuerySchema.parse(req.query);
    res.json(await service.listPublicCategories(resolveTier(req, audience), language));
  } catch (error) {
    next(error);
  }
});

knowledgeBasePublicRoutes.get(
  '/categories/:categorySlug',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categorySlug } = publicCategoryParamsSchema.parse(req.params);
      const { audience, language } = publicCategoriesQuerySchema.parse(req.query);
      res.json(await service.getPublicCategoryPage(categorySlug, resolveTier(req, audience), language));
    } catch (error) {
      next(error);
    }
  },
);

knowledgeBasePublicRoutes.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, language, audience } = publicSearchQuerySchema.parse(req.query);
    res.json(await service.searchPublicArticles(q, resolveTier(req, audience), language));
  } catch (error) {
    next(error);
  }
});

knowledgeBasePublicRoutes.get(
  '/categories/:categorySlug/:subcategorySlug/:articleSlug',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categorySlug, subcategorySlug, articleSlug } = publicArticleParamsSchema.parse(req.params);
      const { language, audience } = publicArticleQuerySchema.parse(req.query);
      res.json(
        await service.getPublicArticle(
          categorySlug,
          subcategorySlug,
          articleSlug,
          language,
          resolveTier(req, audience),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { resolveModuleGrant } from '../../middlewares/authorize';
import { resolveAccessScope, type RecordAccessScope } from '../../lib/scopeFilter';
import { globalSearch, SEARCH_TYPES } from './search.service';
import type { SearchResultType } from './search.types';

const searchQuerySchema = z.object({
  q: z.string().trim().default(''),
});

// No single `requireModule` covers this — each of the 9 searched types has
// its own permission, resolved here once per type (mirroring what
// requireModule does for a single module) and simply omitted from the
// results when the caller can't view that type at all.
export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = searchQuerySchema.parse(req.query);
    if (!q) {
      res.json({ query: q, groups: [] });
      return;
    }

    const scopes: Partial<Record<SearchResultType, RecordAccessScope | undefined>> = {};
    await Promise.all(
      SEARCH_TYPES.map(async ({ type, module }) => {
        const { permission, ownerKey } = await resolveModuleGrant(req, module);
        if (permission.view === 'none') return;
        scopes[type] = await resolveAccessScope({
          accountType: req.user!.accountType,
          companyId: req.user!.companyId,
          grant: permission,
          ownerKey,
          action: 'view',
        });
      }),
    );

    const groups = await globalSearch(q, scopes);
    res.json({ query: q, groups });
  } catch (error) {
    next(error);
  }
}

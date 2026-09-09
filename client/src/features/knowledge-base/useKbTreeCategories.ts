import { useEffect, useState } from 'react';
import { knowledgeBaseApi } from './api/knowledgeBase';
import type { KbCategoryWithSubcategories } from '../../shared/types/index';

// Shared by the category and article pages, which each render the tree
// sidebar alongside their own content - fetched independently per page
// (no shared cache) since the KB feature has no data layer beyond this.
export function useKbTreeCategories(
  audience: string | undefined,
  ready: boolean,
  language: string,
): KbCategoryWithSubcategories[] {
  const [categories, setCategories] = useState<KbCategoryWithSubcategories[]>([]);

  useEffect(() => {
    if (!ready) return;
    knowledgeBaseApi.publicListCategories(audience, language).then(setCategories);
  }, [ready, audience, language]);

  return categories;
}

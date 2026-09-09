import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { resolveCategoryTitle } from '../../shared/utils/kbTranslations';
import type { KbCategoryWithSubcategories } from '../../shared/types/index';
import styles from './KbTreeNav.module.css';

type KbTreeNavProps = {
  categories: KbCategoryWithSubcategories[];
  language: string;
};

export function KbTreeNav({ categories, language }: KbTreeNavProps) {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  // Remounts on every KB navigation (each page owns its own <KnowledgeBaseShell>
  // instance), so seeding from the current route on init is enough - no effect
  // needed to keep this in sync as the user navigates between categories.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(categorySlug ? [categorySlug] : []));

  if (categories.length === 0) return null;

  function toggle(slug: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <nav className={styles['kb-tree']}>
      {categories.map((category) => {
        const hasChildren = category.subcategories.length > 0;
        const isExpanded = expanded.has(category.slug);
        const isActive = category.slug === categorySlug;

        return (
          <div key={category.id} className={styles['kb-tree-category']}>
            <div className={styles['kb-tree-row']}>
              <Link
                to={`/knowledge-base/${category.slug}`}
                className={`${styles['kb-tree-label']}${isActive ? ` ${styles['kb-tree-label--active']}` : ''}`}
              >
                {resolveCategoryTitle(category, language)}
              </Link>
              {hasChildren && (
                <button
                  type="button"
                  className={styles['kb-tree-toggle']}
                  onClick={() => toggle(category.slug)}
                  aria-label={isExpanded ? `Collapse ${category.title}` : `Expand ${category.title}`}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
            </div>
            {hasChildren && isExpanded && (
              <div className={styles['kb-tree-children']}>
                {category.subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    to={`/knowledge-base/${category.slug}#${sub.slug}`}
                    className={styles['kb-tree-sublabel']}
                  >
                    {sub.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

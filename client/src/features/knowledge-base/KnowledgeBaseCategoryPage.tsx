import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { knowledgeBaseApi } from './api/knowledgeBase';
import { KbTreeNav } from './KbTreeNav';
import { KnowledgeBaseShell, useKbAudience, useKbLanguage } from './KnowledgeBaseShell';
import { useKbTreeCategories } from './useKbTreeCategories';
import { useAuth } from '../../shared/contexts/AuthContext';
import { resolveCategoryTitle } from '../../shared/utils/kbTranslations';
import type { PublicKbCategoryPage } from '../../shared/types/index';
import sharedStyles from './KnowledgeBasePublic.module.css';
import styles from './KnowledgeBaseCategoryPage.module.css';

export function KnowledgeBaseCategoryPage() {
  const { user } = useAuth();
  const { audience, ready } = useKbAudience();
  const [language] = useKbLanguage();
  const categories = useKbTreeCategories(audience, ready, language);
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const location = useLocation();
  const [page, setPage] = useState<PublicKbCategoryPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!categorySlug || !ready) return;
    setIsLoading(true);
    knowledgeBaseApi
      .publicGetCategoryPage(categorySlug, audience, language)
      .then(setPage)
      .catch(() => setError('Category not found.'))
      .finally(() => setIsLoading(false));
  }, [categorySlug, ready, audience, language]);

  // Jump to the subcategory section the tree sidebar linked to, once the
  // page's content (and thus the target element) actually exists.
  useEffect(() => {
    if (!page || !location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page, location.hash]);

  if (isLoading) {
    return (
      <KnowledgeBaseShell>
        <div className={sharedStyles['kb-page']}>
          <div className={sharedStyles['kb-content']}><div className="loading">Loading...</div></div>
        </div>
      </KnowledgeBaseShell>
    );
  }

  if (error || !page) {
    return (
      <KnowledgeBaseShell>
        <div className={sharedStyles['kb-page']}>
          <div className={sharedStyles['kb-content']}><div className="empty">{error || 'Category not found.'}</div></div>
        </div>
      </KnowledgeBaseShell>
    );
  }

  const subcategoriesWithArticles = page.subcategories.filter((s) => s.articles.length > 0);

  return (
    <KnowledgeBaseShell>
      <div className={sharedStyles['kb-page']}>
        <div className={`${sharedStyles['kb-hero']} ${sharedStyles['kb-hero--compact']}`}>
          {!user && <span className={sharedStyles['kb-hero-logo']}>CRM System</span>}
          <Link to="/knowledge-base" className={sharedStyles['kb-back-link']}>
            <ArrowLeft size={14} /> Knowledge base
          </Link>
          <h1>{resolveCategoryTitle(page.category, language)}</h1>
          {page.category.description && <p className={styles['kb-hero-desc']}>{page.category.description}</p>}
        </div>

        <div className={sharedStyles['kb-content-wrap']}>
          <KbTreeNav categories={categories} language={language} />
          <div className={sharedStyles['kb-content']}>
            {subcategoriesWithArticles.length === 0 ? (
              <div className="empty">No articles published in this category yet.</div>
            ) : (
              subcategoriesWithArticles.map((sub) => (
                <div className={styles['kb-subcategory-section']} id={sub.slug} key={sub.id}>
                  <h2 className={styles['kb-subcategory-title']}>{sub.title}</h2>
                  <div className={styles['kb-article-list']}>
                    {sub.articles.map((article) => (
                      <Link
                        key={article.id}
                        to={`/knowledge-base/${page.category.slug}/${sub.slug}/${article.slug}`}
                        className={styles['kb-article-list-item']}
                      >
                        <FileText size={16} />
                        <div>
                          <div className={styles['kb-article-list-title']}>{article.title}</div>
                          {article.subtitle && <div className={styles['kb-article-list-subtitle']}>{article.subtitle}</div>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </KnowledgeBaseShell>
  );
}

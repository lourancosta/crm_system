import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { knowledgeBaseApi } from './api/knowledgeBase';
import { KbTreeNav } from './KbTreeNav';
import { KnowledgeBaseShell, useKbAudience, useKbLanguage } from './KnowledgeBaseShell';
import { useKbTreeCategories } from './useKbTreeCategories';
import { useAuth } from '../../shared/contexts/AuthContext';
import { resolveCategoryTitle } from '../../shared/utils/kbTranslations';
import { resolvePrivateMediaInHtml } from '../../shared/utils/privateMedia';
import type { PublicKbArticlePage } from '../../shared/types/index';
import sharedStyles from './KnowledgeBasePublic.module.css';
import styles from './KnowledgeBaseArticlePage.module.css';

const LANGUAGE_LABELS: Record<string, string> = { en: 'English', pt: 'Português', es: 'Español' };

export function KnowledgeBaseArticlePage() {
  const { user } = useAuth();
  const { audience, ready } = useKbAudience();
  const [kbLanguage] = useKbLanguage();
  const categories = useKbTreeCategories(audience, ready, kbLanguage);
  const { categorySlug, subcategorySlug, articleSlug } = useParams<{
    categorySlug: string;
    subcategorySlug: string;
    articleSlug: string;
  }>();
  const [searchParams] = useSearchParams();
  // The in-page toggle below can override this for just this article view -
  // otherwise this article opens in whatever language the KB is currently
  // browsed in (e.g. arriving from a category page filtered to Portuguese).
  const language = searchParams.get('language') ?? kbLanguage;

  const [page, setPage] = useState<PublicKbArticlePage | null>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!categorySlug || !subcategorySlug || !articleSlug || !ready) return;
    setIsLoading(true);
    knowledgeBaseApi
      .publicGetArticle(categorySlug, subcategorySlug, articleSlug, { audience, language })
      .then(async (result) => {
        setPage(result);
        setContent(await resolvePrivateMediaInHtml(result.article.content));
      })
      .catch(() => setError('Article not found.'))
      .finally(() => setIsLoading(false));
  }, [categorySlug, subcategorySlug, articleSlug, language, ready, audience]);

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
          <div className={sharedStyles['kb-content']}><div className="empty">{error || 'Article not found.'}</div></div>
        </div>
      </KnowledgeBaseShell>
    );
  }

  return (
    <KnowledgeBaseShell>
      <div className={sharedStyles['kb-page']}>
        <div className={`${sharedStyles['kb-hero']} ${sharedStyles['kb-hero--compact']}`}>
          {!user && <span className={sharedStyles['kb-hero-logo']}>CRM System</span>}
          <Link to={`/knowledge-base/${page.category.slug}`} className={sharedStyles['kb-back-link']}>
            <ArrowLeft size={14} /> {resolveCategoryTitle(page.category, language)}
          </Link>
        </div>

        <div className={sharedStyles['kb-content-wrap']}>
          <KbTreeNav categories={categories} language={kbLanguage} />
          <div className={`${sharedStyles['kb-content']} ${styles['kb-content--article']}`}>
            {page.availableLanguages.length > 1 && (
              <div className={styles['kb-lang-switch']}>
                {page.availableLanguages.map((variant) => (
                  <Link
                    key={variant.language}
                    to={`/knowledge-base/${variant.categorySlug}/${variant.subcategorySlug}/${variant.articleSlug}`}
                    className={`${styles['kb-lang-option']}${page.article.language === variant.language ? ` ${styles['kb-lang-option--active']}` : ''}`}
                  >
                    {LANGUAGE_LABELS[variant.language] ?? variant.language}
                  </Link>
                ))}
              </div>
            )}

            <article className={styles['kb-article']}>
              <h1>{page.article.title}</h1>
              {page.article.subtitle && <p className={styles['kb-article-subtitle']}>{page.article.subtitle}</p>}
              <div className={styles['kb-article-body']} dangerouslySetInnerHTML={{ __html: content }} />
            </article>
          </div>
        </div>
      </div>
    </KnowledgeBaseShell>
  );
}

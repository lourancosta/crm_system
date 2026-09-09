import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search } from 'lucide-react';
import { knowledgeBaseApi } from './api/knowledgeBase';
import { KnowledgeBaseShell, useKbAudience, useKbLanguage } from './KnowledgeBaseShell';
import { useAuth } from '../../shared/contexts/AuthContext';
import { isPrivateMediaUrl, resolvePrivateMediaUrl } from '../../shared/utils/privateMedia';
import { resolveCategoryTitle } from '../../shared/utils/kbTranslations';
import type { KbArticleSearchResult, KbCategoryWithSubcategories } from '../../shared/types/index';
import sharedStyles from './KnowledgeBasePublic.module.css';
import styles from './KnowledgeBasePage.module.css';

export function KnowledgeBasePage() {
  const { user } = useAuth();
  const { audience, ready } = useKbAudience();
  const [language] = useKbLanguage();
  const [categories, setCategories] = useState<KbCategoryWithSubcategories[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<KbArticleSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setIsLoading(true);
    knowledgeBaseApi
      .publicListCategories(audience, language)
      .then(async (result) => {
        setCategories(result);
        const entries = await Promise.all(
          result
            .filter((c) => c.imageUrl && isPrivateMediaUrl(c.imageUrl))
            .map(async (c) => [c.id, await resolvePrivateMediaUrl(c.imageUrl!)] as const),
        );
        setThumbnails(Object.fromEntries(entries));
      })
      .finally(() => setIsLoading(false));
  }, [ready, audience, language]);

  // Article title/subtitle search, replacing the old category-name filter -
  // debounced so we're not firing a request on every keystroke.
  useEffect(() => {
    const query = search.trim();
    if (!ready || !query) {
      setResults(null);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      knowledgeBaseApi
        .publicSearchArticles(query, { audience, language })
        .then(setResults)
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, ready, audience, language]);

  function subcategoryFor(categoryId: string, subcategoryId: string) {
    const category = categories.find((c) => c.id === categoryId);
    return category ? { category, subcategory: category.subcategories.find((s) => s.id === subcategoryId) } : null;
  }

  const isSearchMode = search.trim().length > 0;

  return (
    <KnowledgeBaseShell>
      <div className={sharedStyles['kb-page']}>
        <div className={sharedStyles['kb-hero']}>
          {!user && <span className={sharedStyles['kb-hero-logo']}>CRM System</span>}
          <h1>How can we help?</h1>
          <div className={styles['kb-search']}>
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
            />
          </div>
        </div>

        <div className={`${sharedStyles['kb-content']} ${styles['kb-content--home']}`}>
          {isSearchMode ? (
            isSearching ? (
              <div className="loading">Searching...</div>
            ) : !results || results.length === 0 ? (
              <div className="empty">No articles found for &quot;{search.trim()}&quot;.</div>
            ) : (
              <div className={styles['kb-search-results']}>
                {results.map((article) => {
                  const match = subcategoryFor(article.categoryId, article.subcategoryId);
                  if (!match?.subcategory) return null;
                  const { category, subcategory } = match;
                  return (
                    <Link
                      key={article.id}
                      to={`/knowledge-base/${category.slug}/${subcategory.slug}/${article.slug}`}
                      className={styles['kb-search-result-item']}
                    >
                      <FileText size={16} />
                      <div>
                        <div className={styles['kb-search-result-title']}>{article.title}</div>
                        {article.subtitle && (
                          <div className={styles['kb-search-result-subtitle']}>{article.subtitle}</div>
                        )}
                        <div className={styles['kb-search-result-breadcrumb']}>
                          {resolveCategoryTitle(category, language)} / {subcategory.title}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          ) : isLoading ? (
            <div className="loading">Loading...</div>
          ) : categories.length === 0 ? (
            <div className="empty">No knowledge base categories yet.</div>
          ) : (
            <div className={styles['kb-grid']}>
              {categories.map((c) => (
                <Link to={`/knowledge-base/${c.slug}`} key={c.id} className={styles['kb-card']}>
                  <div
                    className={styles['kb-card-image']}
                    style={c.imageUrl ? { backgroundImage: `url(${thumbnails[c.id] ?? c.imageUrl})` } : undefined}
                  />
                  <div className={styles['kb-card-body']}>
                    <div className={styles['kb-card-title']}>{resolveCategoryTitle(c, language)}</div>
                    {c.description && <div className={styles['kb-card-desc']}>{c.description}</div>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </KnowledgeBaseShell>
  );
}

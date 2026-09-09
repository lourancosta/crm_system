import { useEffect, useState } from 'react';
import { knowledgeBaseApi } from './api/knowledgeBase';
import { Button } from '../../shared/components/Button/Button';
import { Modal } from '../../shared/components/Modal/Modal';
import type { KbArticle, KbArticleSummary } from '../../shared/types/index';

const LANGUAGE_LABELS: Record<string, string> = { en: 'English', pt: 'Português', es: 'Español' };

type GroupArticleModalProps = {
  article: KbArticleSummary;
  onClose: () => void;
  onGrouped: (updated: KbArticle) => void;
};

export function GroupArticleModal({ article, onClose, onGrouped }: GroupArticleModalProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [results, setResults] = useState<KbArticleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<KbArticleSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setIsLoading(true);
    knowledgeBaseApi
      .listArticles({ search: debouncedSearch, limit: 20 })
      // Grouping links two language variants of the same logical article -
      // same language would collide (see kb.service.ts groupArticleWith),
      // so those aren't valid candidates.
      .then((r) => setResults(r.data.filter((a) => a.id !== article.id && a.language !== article.language)))
      .finally(() => setIsLoading(false));
  }, [debouncedSearch, article.id, article.language]);

  async function handleConfirm() {
    if (!selected) return;
    setIsSaving(true);
    setError('');
    try {
      const updated = await knowledgeBaseApi.groupArticle(article.id, selected.id);
      onGrouped(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to group articles');
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title={`Group "${article.title}" with…`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} isLoading={isSaving} disabled={!selected}>
            Group
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0, marginBottom: 12 }}>
        Pick the article this is a translation of — it must be in a different language than{' '}
        <strong>{LANGUAGE_LABELS[article.language] ?? article.language}</strong>. Grouping only links the two as
        language variants of each other (for the language switcher and this admin list) — each article keeps its own
        category, subcategory, and URL slug.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      <input
        className="search-input"
        type="search"
        placeholder="Search articles by title…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
        autoFocus
      />
      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isLoading ? (
          <div className="loading">Loading…</div>
        ) : results.length === 0 ? (
          <div className="empty">No matching articles in another language.</div>
        ) : (
          results.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a)}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 6,
                border: `1px solid ${selected?.id === a.id ? 'var(--link)' : 'var(--border)'}`,
                background: selected?.id === a.id ? 'var(--selected-bg)' : 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {LANGUAGE_LABELS[a.language] ?? a.language}
              </div>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

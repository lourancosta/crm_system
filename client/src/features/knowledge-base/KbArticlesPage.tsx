import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Languages, Pencil, Trash2, Unlink } from 'lucide-react';
import { knowledgeBaseApi } from './api/knowledgeBase';
import { Button } from '../../shared/components/Button/Button';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import { Table } from '../../shared/components/Table/Table';
import type { Column } from '../../shared/components/Table/Table';
import { Select } from '../../shared/components/Dropdown/Select';
import { GroupArticleModal } from './GroupArticleModal';
import { KB_ARTICLE_FORM_ID, KbArticleEditorPage } from './KbArticleEditorPage';
import { Modal } from '../../shared/components/Modal/Modal';
import type { KbArticle, KbArticleSummary, KbCategoryWithSubcategories } from '../../shared/types/index';
import styles from './KbArticlesPage.module.css';

const PAGE_SIZE = 50;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#9ca3af' },
  published: { label: 'Published', color: '#16a34a' },
};
const TIER_LABELS: Record<string, string> = { public: 'Public', customer: 'Customer', partner: 'Partner', internal: 'Internal' };
const LANGUAGE_LABELS: Record<string, string> = { en: 'English', pt: 'Português', es: 'Español' };

const LANGUAGE_OPTIONS = [
  { value: '', label: 'All languages' },
  ...Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label })),
];

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: '#9ca3af' };
  return (
    <span className="status-badge">
      <span className="status-dot" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}

type DisplayRow = KbArticleSummary & {
  __groupKey: string;
  __hasSiblings: boolean;
  __isChild: boolean;
};

// Groups articles that are language variants of the same logical article
// (share a translationGroupId - see kb schema comment on kbArticle) so they
// render as one collapsible row instead of scattered duplicates. Ungrouped
// articles key off their own id, so they never accidentally collide with
// each other. Grouping only happens among rows already loaded on the
// current page - two variants that land on different pages of results just
// won't group.
function buildDisplayRows(articles: KbArticleSummary[], expandedGroups: Set<string>): DisplayRow[] {
  const order: string[] = [];
  const byKey = new Map<string, KbArticleSummary[]>();
  for (const a of articles) {
    const key = a.translationGroupId ?? a.id;
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(a);
  }

  const rows: DisplayRow[] = [];
  for (const key of order) {
    const variants = byKey.get(key)!;
    const primary = variants.find((v) => v.language === 'en') ?? variants[0];
    const hasSiblings = variants.length > 1;
    rows.push({ ...primary, __groupKey: key, __hasSiblings: hasSiblings, __isChild: false });
    if (hasSiblings && expandedGroups.has(key)) {
      for (const v of variants) {
        if (v === primary) continue;
        rows.push({ ...v, __groupKey: key, __hasSiblings: true, __isChild: true });
      }
    }
  }
  return rows;
}

export function KbArticlesPage() {
  const [articles, setArticles] = useState<KbArticleSummary[]>([]);
  const [categories, setCategories] = useState<KbCategoryWithSubcategories[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deletingArticle, setDeletingArticle] = useState<KbArticleSummary | null>(null);
  const [groupingArticle, setGroupingArticle] = useState<KbArticleSummary | null>(null);
  // 'new' opens the editor with no id; a string opens it for that article's id.
  const [editingArticleId, setEditingArticleId] = useState<string | 'new' | null>(null);
  const [isSavingArticle, setIsSavingArticle] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    knowledgeBaseApi.listCategories().then(setCategories);
  }, []);

  function loadArticles(searchOverride?: string) {
    setIsLoading(true);
    return knowledgeBaseApi
      .listArticles({ page, limit: PAGE_SIZE, search: searchOverride ?? debouncedSearch, categoryId, language: language || undefined })
      .then((r) => { setArticles(r.data); setTotal(r.total); })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadArticles();
  }, [page, debouncedSearch, categoryId, language]);

  function handleCategoryChange(value: string) {
    setCategoryId(value);
    setPage(1);
  }

  function handleLanguageChange(value: string) {
    setLanguage(value);
    setPage(1);
  }

  async function handleDelete() {
    if (!deletingArticle) return;
    await knowledgeBaseApi.deleteArticle(deletingArticle.id);
    setDeletingArticle(null);
    loadArticles();
  }

  function handleArticleSaved() {
    setEditingArticleId(null);
    loadArticles();
  }

  async function handleUngroup(article: DisplayRow) {
    await knowledgeBaseApi.ungroupArticle(article.id);
    await loadArticles();
  }

  async function handleGrouped(groupedArticle: KbArticle) {
    setGroupingArticle(null);
    if (groupedArticle.translationGroupId) {
      setExpandedGroups((prev) => new Set(prev).add(groupedArticle.translationGroupId!));
    }
    // A lingering search term can hide the sibling this article just got
    // grouped with (its title won't match a search typed for the source
    // article's own language) - looks like grouping silently failed even
    // though it worked. Clear the filter so both variants are visible.
    setSearch('');
    setDebouncedSearch('');
    await loadArticles('');
  }

  function categoryLabel(categoryId: string) {
    return categories.find((c) => c.id === categoryId)?.title ?? '—';
  }

  function subcategoryLabel(categoryId: string, subcategoryId: string) {
    const category = categories.find((c) => c.id === categoryId);
    return category?.subcategories.find((s) => s.id === subcategoryId)?.title ?? '—';
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const displayRows = buildDisplayRows(articles, expandedGroups);

  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...categories.map((c) => ({ value: c.id, label: c.title })),
  ];

  const columns: Column<DisplayRow>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (a) => (
        <div className={styles['title-cell']}>
          <div className={styles['title-cell-name']} style={{ paddingLeft: a.__isChild ? 22 : 0 }}>
            {!a.__isChild && a.__hasSiblings && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGroup(a.__groupKey);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
                aria-label={expandedGroups.has(a.__groupKey) ? 'Collapse language variants' : 'Show language variants'}
              >
                {expandedGroups.has(a.__groupKey) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            <button
              type="button"
              className="link"
              style={{ border: 'none', background: 'none', padding: 0, font: 'inherit' }}
              onClick={() => setEditingArticleId(a.id)}
            >
              {a.title}
            </button>
          </div>
          <span className={styles['row-actions']}>
            <RowActionsMenu
              label="Actions"
              icon={ChevronDown}
              triggerClassName={styles['actions-trigger']}
              actions={[
                { label: 'Edit', icon: Pencil, onClick: () => setEditingArticleId(a.id) },
                { label: 'Group article languages', icon: Languages, onClick: () => setGroupingArticle(a) },
                ...(a.__isChild
                  ? [{ label: 'Remove from group', icon: Unlink, onClick: () => handleUngroup(a) }]
                  : []),
                { label: 'Delete', icon: Trash2, onClick: () => setDeletingArticle(a), variant: 'danger' },
              ]}
            />
          </span>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (a) => categoryLabel(a.categoryId) },
    { key: 'subcategory', header: 'Subcategory', render: (a) => subcategoryLabel(a.categoryId, a.subcategoryId) },
    { key: 'language', header: 'Language', render: (a) => LANGUAGE_LABELS[a.language] ?? a.language.toUpperCase() },
    { key: 'visibility', header: 'Visibility', render: (a) => TIER_LABELS[a.visibility] ?? a.visibility },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'updatedAt', header: 'Updated', render: (a) => new Date(a.updatedAt).toLocaleDateString() },
  ];

  return (
    <div className={styles['articles-page']}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div className="table-toolbar" style={{ marginBottom: 0 }}>
          <input
            className="search-input"
            type="search"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={categoryId} onChange={handleCategoryChange} options={categoryOptions} ariaLabel="Category" />
          <Select value={language} onChange={handleLanguageChange} options={LANGUAGE_OPTIONS} ariaLabel="Language" />
        </div>
        <Button onClick={() => setEditingArticleId('new')}>+ New Article</Button>
      </div>

      <Table
        columns={columns}
        data={displayRows}
        keyExtractor={(a) => a.id}
        isLoading={isLoading}
        emptyMessage="No articles yet."
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />

      {groupingArticle && (
        <GroupArticleModal
          article={groupingArticle}
          onClose={() => setGroupingArticle(null)}
          onGrouped={handleGrouped}
        />
      )}

      {editingArticleId && (
        <Modal
          title={editingArticleId === 'new' ? 'New Article' : 'Edit Article'}
          variant="fullscreen"
          onClose={() => setEditingArticleId(null)}
          headerActions={
            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="button" variant="secondary" onClick={() => setEditingArticleId(null)}>
                Cancel
              </Button>
              <Button type="submit" form={KB_ARTICLE_FORM_ID} isLoading={isSavingArticle} variant="accent">
                Save
              </Button>
            </div>
          }
        >
          <KbArticleEditorPage
            articleId={editingArticleId === 'new' ? undefined : editingArticleId}
            onSaved={handleArticleSaved}
            onSavingChange={setIsSavingArticle}
          />
        </Modal>
      )}

      {deletingArticle && (
        <ConfirmDialog
          title="Delete Article?"
          message={`You are about to delete "${deletingArticle.title}". This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingArticle(null)}
        />
      )}
    </div>
  );
}

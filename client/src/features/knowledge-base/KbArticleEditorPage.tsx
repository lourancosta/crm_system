import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { knowledgeBaseApi } from './api/knowledgeBase';
import { ArticleEditor } from './ArticleEditor';
import { Select } from '../../shared/components/Dropdown/Select';
import { resolveCategoryTitle } from '../../shared/utils/kbTranslations';
import { KB_ARTICLE_STATUSES, KB_LANGUAGES, KB_TIERS } from '../../shared/types/index';
import type { KbArticleStatus, KbCategoryWithSubcategories, KbLanguage, KbTier } from '../../shared/types/index';
import styles from './KbArticleEditorPage.module.css';

const TIER_LABELS: Record<KbTier, string> = { public: 'Public', customer: 'Customer', partner: 'Partner', internal: 'Internal' };
const LANGUAGE_LABELS: Record<KbLanguage, string> = { en: 'English', pt: 'Português', es: 'Español' };
const STATUS_LABELS: Record<KbArticleStatus, string> = { draft: 'Draft', published: 'Published' };

// Referenced by the Save button rendered in the fullscreen modal's header
// (outside this component's own <form>) via the HTML `form` attribute.
export const KB_ARTICLE_FORM_ID = 'kb-article-editor-form';

type KbArticleEditorPageProps = {
  articleId?: string;
  onSaved: () => void;
  // Reports isSaving up so the header Save button (rendered by the parent,
  // outside this form) can show a loading state.
  onSavingChange?: (isSaving: boolean) => void;
};

export function KbArticleEditorPage({ articleId, onSaved, onSavingChange }: KbArticleEditorPageProps) {
  const isEditing = Boolean(articleId);

  const [categories, setCategories] = useState<KbCategoryWithSubcategories[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [slug, setSlug] = useState('');
  const [language, setLanguage] = useState<KbLanguage>('en');
  const [visibility, setVisibility] = useState<KbTier>('internal');
  const [status, setStatus] = useState<KbArticleStatus>('draft');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    knowledgeBaseApi.listCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!isEditing || !articleId) return;
    knowledgeBaseApi
      .getArticle(articleId)
      .then((a) => {
        setCategoryId(a.categoryId);
        setSubcategoryId(a.subcategoryId);
        setTitle(a.title);
        setSubtitle(a.subtitle ?? '');
        setSlug(a.slug);
        setLanguage(a.language as KbLanguage);
        setVisibility(a.visibility);
        setStatus(a.status as KbArticleStatus);
        setContent(a.content);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load article'))
      .finally(() => setIsLoading(false));
  }, [articleId, isEditing]);

  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!categoryId || !subcategoryId) {
      setError('Please select a category and subcategory');
      return;
    }
    setIsSaving(true);
    const input = { categoryId, subcategoryId, slug, language, title, subtitle: subtitle || undefined, content, visibility, status };
    try {
      if (isEditing && articleId) {
        await knowledgeBaseApi.updateArticle(articleId, input);
      } else {
        await knowledgeBaseApi.createArticle(input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save article');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="loading">Loading...</div>;

  return (
    <form id={KB_ARTICLE_FORM_ID} onSubmit={handleSubmit} className={styles['editor-layout']}>
      <aside className={styles.aside}>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label>Language</label>
          <Select
            value={language}
            onChange={(value) => setLanguage(value as KbLanguage)}
            options={KB_LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }))}
          />
        </div>

        <div className="form-group">
          <label>Category</label>
          <Select
            value={categoryId}
            onChange={(value) => { setCategoryId(value); setSubcategoryId(''); }}
            options={[
              { value: '', label: 'Select a category…' },
              ...categories.map((c) => ({ value: c.id, label: resolveCategoryTitle(c, language) })),
            ]}
          />
        </div>

        <div className="form-group">
          <label>Subcategory</label>
          <Select
            value={subcategoryId}
            onChange={setSubcategoryId}
            options={[
              { value: '', label: 'Select a subcategory…' },
              ...(selectedCategory?.subcategories.map((s) => ({ value: s.id, label: s.title })) ?? []),
            ]}
          />
        </div>

        <div className="form-group">
          <label>Custom final URL (slug)</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
          {selectedCategory && subcategoryId && (
            <small className={styles['slug-preview']}>
              /knowledge-base/{selectedCategory.slug}/{selectedCategory.subcategories.find((s) => s.id === subcategoryId)?.slug}/{slug || '…'}
            </small>
          )}
        </div>

        <div className="form-group">
          <label>Minimum visibility tier</label>
          <Select
            value={visibility}
            onChange={setVisibility}
            options={KB_TIERS.map((t) => ({ value: t, label: TIER_LABELS[t] }))}
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <Select
            value={status}
            onChange={(value) => setStatus(value as KbArticleStatus)}
            options={KB_ARTICLE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          />
        </div>
      </aside>

      <div className={styles['editor-main']}>
        <input
          className={styles['title-input']}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title"
          required
          autoFocus
        />
        <input
          className={styles['subtitle-input']}
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Subtitle (optional)"
        />
        <ArticleEditor value={content} onChange={setContent} visibility={visibility} fillHeight />
      </div>
    </form>
  );
}

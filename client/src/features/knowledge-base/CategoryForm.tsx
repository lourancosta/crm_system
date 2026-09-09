import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { knowledgeBaseApi } from './api/knowledgeBase';
import { Button } from '../../shared/components/Button/Button';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { isPrivateMediaUrl, resolvePrivateMediaUrl } from '../../shared/utils/privateMedia';
import type { CreateKbCategoryInput, KbCategory } from '../../shared/types/index';

type CategoryFormProps = {
  initial?: KbCategory;
  onSubmit: (input: CreateKbCategoryInput) => void;
  onCancel: () => void;
};

export function CategoryForm({ initial, onSubmit, onCancel }: CategoryFormProps) {
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [titlePt, setTitlePt] = useState(initial?.translations?.pt ?? '');
  const [titleEs, setTitleEs] = useState(initial?.translations?.es ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The thumbnail's canonical src (imageUrl) may be a private-media path that
  // a plain <img> can't load directly - resolve it to a session-local blob
  // URL for preview only, keeping imageUrl itself as what actually gets saved.
  useEffect(() => {
    if (!imageUrl) {
      setPreviewSrc('');
      return;
    }
    if (!isPrivateMediaUrl(imageUrl)) {
      setPreviewSrc(imageUrl);
      return;
    }
    let cancelled = false;
    resolvePrivateMediaUrl(imageUrl)
      .then((url) => {
        if (!cancelled) setPreviewSrc(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewSrc('');
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploading(true);
    try {
      // Category thumbnails are treated as low-sensitivity branding (an
      // icon/logo) regardless of which articles end up inside the category,
      // so they always go to the public bucket.
      const { url } = await knowledgeBaseApi.uploadMedia(file, 'public');
      setImageUrl(url);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  const [handleSubmit, isSubmitting] = useSubmitGuard(async (e: FormEvent) => {
    e.preventDefault();
    const translations: Record<string, string> = {};
    if (titlePt.trim()) translations.pt = titlePt.trim();
    if (titleEs.trim()) translations.es = titleEs.trim();
    await onSubmit({
      slug,
      title,
      translations: Object.keys(translations).length > 0 ? translations : undefined,
      description: description || undefined,
      imageUrl: imageUrl || undefined,
    });
  });

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>Title (English)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Title (Portuguese)</label>
          <input value={titlePt} onChange={(e) => setTitlePt(e.target.value)} placeholder="Falls back to English" />
        </div>
        <div className="form-group">
          <label>Title (Spanish)</label>
          <input value={titleEs} onChange={(e) => setTitleEs(e.target.value)} placeholder="Falls back to English" />
        </div>
      </div>
      <div className="form-group">
        <label>Slug (used in the URL)</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          placeholder="billing"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
        />
      </div>
      <div className="form-group">
        <label>Short description (shown on the category square)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div className="form-group">
        <label>Image</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            style={{ flex: 1 }}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={isUploading}>
            Upload
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelected} />
        </div>
        {previewSrc && (
          <img src={previewSrc} alt="" style={{ marginTop: 8, width: 120, height: 90, objectFit: 'cover', borderRadius: 6 }} />
        )}
      </div>
      <div className="settings-form-footer">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>Save</Button>
      </div>
    </form>
  );
}

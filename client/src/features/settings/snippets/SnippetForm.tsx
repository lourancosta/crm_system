import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../shared/components/Button/Button';
import { RichTextEditor } from '../../../shared/components/RichTextEditor/RichTextEditor';
import type { CreateSnippetInput, Snippet } from '../../../shared/types/index';

type Props = {
  initial?: Snippet;
  onSubmit: (data: CreateSnippetInput) => Promise<void>;
  onCancel: () => void;
};

export function SnippetForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({ name, content });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save snippet');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label>Snippet name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Standard payment terms" />
      </div>

      <div className="form-group">
        <label>Content</label>
        <RichTextEditor value={content} onChange={setContent} placeholder="Snippet content" />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : initial ? 'Save changes' : 'Create snippet'}
        </Button>
      </div>
    </form>
  );
}

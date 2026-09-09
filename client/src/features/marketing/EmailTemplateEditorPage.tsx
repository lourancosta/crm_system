import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { emailTemplatesApi } from './api/emailTemplates';
import { Button } from '../../shared/components/Button/Button';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { FileStorageBanner } from '../../shared/components/SetupBanner/FileStorageBanner';
import { Toggle } from '../../shared/components/Toggle/Toggle';
import { tokensForObjects } from './emailTemplateTokens';
import { EMAIL_TEMPLATE_OBJECTS } from '../../shared/types/index';
import type { EmailTemplateObject } from '../../shared/types/index';

const OBJECT_LABELS: Record<EmailTemplateObject, string> = {
  contacts: 'Contact',
  companies: 'Company',
  deals: 'Deal',
  invoices: 'Invoice',
};

export function EmailTemplateEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id) && id !== 'new';

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [objects, setObjects] = useState<EmailTemplateObject[]>([]);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing || !id) return;
    emailTemplatesApi
      .getById(id)
      .then((t) => {
        setName(t.name);
        setSubject(t.subject);
        setHtmlBody(t.htmlBody);
        setObjects(t.objects);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load template'))
      .finally(() => setIsLoading(false));
  }, [id, isEditing]);

  function toggleObject(o: EmailTemplateObject) {
    setObjects((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      if (isEditing && id) {
        await emailTemplatesApi.update(id, { name, subject, htmlBody, objects });
      } else {
        await emailTemplatesApi.create({ name, subject, htmlBody, objects });
      }
      navigate('/marketing/emails');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="loading">Loading...</div>;

  const availableTokens = tokensForObjects(objects);

  return (
    <div className="page">
      <div className="page-header">
        <h1>{isEditing ? 'Edit email template' : 'New email template'}</h1>
      </div>
      <FileStorageBanner />
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Invoice Due Reminder"
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Applies to</label>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {EMAIL_TEMPLATE_OBJECTS.map((o) => (
              <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0, fontWeight: 400 }}>
                <Toggle checked={objects.includes(o)} onChange={() => toggleObject(o)} />
                {OBJECT_LABELS[o]}
              </label>
            ))}
          </div>
          <small style={{ color: 'var(--text-muted)' }}>
            Selecting an object adds its merge tokens to the "Insert token" button below, and lets features (like
            invoice reminders) offer this template as an option.
          </small>
        </div>
        <div className="form-group">
          <label>Content</label>
          <EmailTemplateEditor value={htmlBody} onChange={setHtmlBody} tokens={availableTokens} />
        </div>

        <div className="settings-form-footer">
          <Button type="button" variant="secondary" onClick={() => navigate('/marketing/emails')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

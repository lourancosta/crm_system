import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { emailTemplatesApi } from '../../marketing/api/emailTemplates';
import { Button } from '../../../shared/components/Button/Button';
import { Select } from '../../../shared/components/Dropdown/Select';
import { Toggle } from '../../../shared/components/Toggle/Toggle';
import type { CreateReminderRuleInput, EmailTemplate, ReminderRule } from '../../../shared/types/index';

type Props = {
  initial?: ReminderRule;
  onSubmit: (data: CreateReminderRuleInput) => Promise<void>;
  onCancel: () => void;
};

export function ReminderRuleForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    label: initial?.label ?? '',
    daysBeforeTrigger: initial ? String(initial.daysBeforeTrigger) : '',
    emailTemplateId: initial?.emailTemplateId ?? '',
    enabled: initial?.enabled ?? true,
  });
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    emailTemplatesApi
      .list({ object: 'invoices', limit: 100 })
      .then((r) => setTemplates(r.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load email templates'));
  }, []);

  function set(field: 'label' | 'daysBeforeTrigger') {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.emailTemplateId) {
      setError('Select an email template');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        objectType: 'invoices',
        label: form.label,
        daysBeforeTrigger: Number(form.daysBeforeTrigger),
        emailTemplateId: form.emailTemplateId,
        enabled: form.enabled,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reminder rule');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label>Label *</label>
        <input value={form.label} onChange={set('label')} required placeholder="e.g. Payment reminder" />
      </div>

      <div className="form-group">
        <label>Days before due date *</label>
        <input
          type="number"
          step="1"
          value={form.daysBeforeTrigger}
          onChange={set('daysBeforeTrigger')}
          required
          placeholder="e.g. 30 (0 = due date itself)"
        />
      </div>

      <div className="form-group">
        <label>Email template *</label>
        <Select
          value={form.emailTemplateId}
          onChange={(value) => setForm((prev) => ({ ...prev, emailTemplateId: value }))}
          options={[
            { value: '', label: 'Select a template…' },
            ...templates.map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
        <small style={{ color: 'var(--text-muted)' }}>
          <Link to="/marketing/emails/new" className="link" target="_blank" rel="noopener noreferrer">
            + New template
          </Link>{' '}
          or{' '}
          <Link to="/marketing/emails" className="link" target="_blank" rel="noopener noreferrer">
            manage templates
          </Link>{' '}
          in Marketing &gt; Emails.
        </small>
      </div>

      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Toggle
          id="reminder-rule-enabled"
          checked={form.enabled}
          onChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
        />
        <label htmlFor="reminder-rule-enabled" style={{ marginBottom: 0 }}>Enabled</label>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : initial ? 'Save changes' : 'Create rule'}
        </Button>
      </div>
    </form>
  );
}

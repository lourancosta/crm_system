import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { pipelinesApi } from '../../shared/api/pipelines';
import { Button } from '../../shared/components/Button/Button';
import { Select } from '../../shared/components/Dropdown/Select';
import { Toggle } from '../../shared/components/Toggle/Toggle';
import type { CreateSupportInboxInput, PipelineWithStages, SupportInbox, SupportInboxAuthType } from '../../shared/types/index';

type Props = {
  initial?: SupportInbox;
  onSubmit: (input: CreateSupportInboxInput) => Promise<void>;
  onCancel: () => void;
};

const AUTH_TYPE_OPTIONS: { value: SupportInboxAuthType; label: string }[] = [
  { value: 'password', label: 'Password' },
  { value: 'microsoft_oauth', label: 'Microsoft 365 (OAuth)' },
];

export function SupportInboxForm({ initial, onSubmit, onCancel }: Props) {
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    imapHost: initial?.imapHost ?? '',
    imapPort: String(initial?.imapPort ?? 993),
    imapSecure: initial?.imapSecure ?? true,
    imapUser: initial?.imapUser ?? '',
    authType: initial?.authType ?? ('password' as SupportInboxAuthType),
    imapPassword: '',
    msTenantId: initial?.msTenantId ?? '',
    msClientId: initial?.msClientId ?? '',
    msClientSecret: '',
    smtpHost: initial?.smtpHost ?? '',
    smtpPort: initial?.smtpPort ? String(initial.smtpPort) : '',
    folder: initial?.folder ?? 'INBOX',
    pipelineId: initial?.pipelineId ?? '',
    defaultStageId: initial?.defaultStageId ?? '',
    enabled: initial?.enabled ?? false,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    pipelinesApi
      .list('tickets')
      .then(setPipelines)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load pipelines'));
  }, []);

  const selectedPipeline = pipelines.find((p) => p.id === form.pipelineId);

  function set(
    field:
      | 'name'
      | 'imapHost'
      | 'imapPort'
      | 'imapUser'
      | 'imapPassword'
      | 'msTenantId'
      | 'msClientId'
      | 'msClientSecret'
      | 'smtpHost'
      | 'smtpPort'
      | 'folder',
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handlePipelineChange(pipelineId: string) {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    setForm((prev) => ({ ...prev, pipelineId, defaultStageId: pipeline?.stages[0]?.id ?? '' }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.pipelineId || !form.defaultStageId) {
      setError('Select a pipeline and default stage');
      return;
    }
    if (!initial) {
      if (form.authType === 'password' && !form.imapPassword) {
        setError('Password is required');
        return;
      }
      if (form.authType === 'microsoft_oauth' && (!form.msTenantId || !form.msClientId || !form.msClientSecret)) {
        setError('Tenant ID, Client ID, and Client secret are required');
        return;
      }
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: form.name,
        imapHost: form.imapHost,
        imapPort: Number(form.imapPort),
        imapSecure: form.imapSecure,
        imapUser: form.imapUser,
        authType: form.authType,
        imapPassword: form.imapPassword || undefined,
        msTenantId: form.msTenantId || undefined,
        msClientId: form.msClientId || undefined,
        msClientSecret: form.msClientSecret || undefined,
        smtpHost: form.smtpHost || undefined,
        smtpPort: form.smtpPort ? Number(form.smtpPort) : undefined,
        folder: form.folder,
        pipelineId: form.pipelineId,
        defaultStageId: form.defaultStageId,
        enabled: form.enabled,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save support inbox');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label>Name</label>
        <input value={form.name} onChange={set('name')} placeholder="e.g. Support inbox" required autoFocus />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div className="form-group" style={{ flex: 2 }}>
          <label>IMAP host</label>
          <input value={form.imapHost} onChange={set('imapHost')} placeholder="imap.gmail.com" required />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Port</label>
          <input type="number" value={form.imapPort} onChange={set('imapPort')} required />
        </div>
      </div>

      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Toggle
          id="support-inbox-secure"
          checked={form.imapSecure}
          onChange={(checked) => setForm((prev) => ({ ...prev, imapSecure: checked }))}
        />
        <label htmlFor="support-inbox-secure" style={{ marginBottom: 0 }}>Use TLS</label>
      </div>

      <div className="form-group">
        <label>IMAP username</label>
        <input value={form.imapUser} onChange={set('imapUser')} required />
      </div>

      <div className="form-group">
        <label>Authentication</label>
        <Select
          value={form.authType}
          onChange={(value) => setForm((prev) => ({ ...prev, authType: value as SupportInboxAuthType }))}
          options={AUTH_TYPE_OPTIONS}
        />
      </div>

      {form.authType === 'password' && (
        <div className="form-group">
          <label>IMAP password{initial ? ' (leave blank to keep current)' : ''}</label>
          <input
            type="password"
            value={form.imapPassword}
            onChange={set('imapPassword')}
            placeholder={initial ? '••••••••' : ''}
          />
          <small style={{ color: 'var(--text-muted)' }}>
            Gmail/Google Workspace mailboxes need an App Password, not the account's normal login password. Microsoft
            365 mailboxes no longer support password auth for IMAP — use Microsoft 365 (OAuth) instead.
          </small>
        </div>
      )}

      {form.authType === 'password' && (
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label>SMTP host (optional — enables sending messages from tickets)</label>
            <input value={form.smtpHost} onChange={set('smtpHost')} placeholder="smtp.gmail.com" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Port</label>
            <input type="number" value={form.smtpPort} onChange={set('smtpPort')} placeholder="587" />
          </div>
        </div>
      )}

      {form.authType === 'microsoft_oauth' && (
        <>
          <div className="form-group">
            <label>Tenant ID</label>
            <input value={form.msTenantId} onChange={set('msTenantId')} placeholder="e.g. contoso.onmicrosoft.com" />
          </div>
          <div className="form-group">
            <label>Client ID</label>
            <input value={form.msClientId} onChange={set('msClientId')} />
          </div>
          <div className="form-group">
            <label>Client secret{initial ? ' (leave blank to keep current)' : ''}</label>
            <input
              type="password"
              value={form.msClientSecret}
              onChange={set('msClientSecret')}
              placeholder={initial ? '••••••••' : ''}
            />
            <small style={{ color: 'var(--text-muted)' }}>
              From an Azure app registration with admin-consented <code>IMAP.AccessAsApp</code> permission. The IMAP
              username above should be the mailbox address (e.g. support@yourcompany.com).
            </small>
          </div>
        </>
      )}

      <div className="form-group">
        <label>Folder</label>
        <input value={form.folder} onChange={set('folder')} placeholder="INBOX" required />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Pipeline</label>
          <Select
            value={form.pipelineId}
            onChange={handlePipelineChange}
            options={[
              { value: '', label: 'Select a pipeline…' },
              ...pipelines.map((p) => ({ value: p.id, label: p.externalName })),
            ]}
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Default stage</label>
          <Select
            value={form.defaultStageId}
            onChange={(value) => setForm((prev) => ({ ...prev, defaultStageId: value }))}
            options={[
              { value: '', label: 'Select a stage…' },
              ...(selectedPipeline?.stages.map((s) => ({ value: s.id, label: s.externalName })) ?? []),
            ]}
          />
        </div>
      </div>

      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Toggle
          id="support-inbox-enabled"
          checked={form.enabled}
          onChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
        />
        <label htmlFor="support-inbox-enabled" style={{ marginBottom: 0 }}>Enabled</label>
      </div>

      <div className="settings-form-footer">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : initial ? 'Save changes' : 'Connect inbox'}
        </Button>
      </div>
    </form>
  );
}

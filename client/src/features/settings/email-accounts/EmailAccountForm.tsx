import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../shared/components/Button/Button';
import { useSubmitGuard } from '../../../shared/hooks/useSubmitGuard';
import type { CreateEmailAccountInput, EmailAccount } from '../../../shared/types/index';

type EmailAccountFormProps = {
  initial?: EmailAccount;
  onSubmit: (input: CreateEmailAccountInput) => void;
  onCancel: () => void;
};

export function EmailAccountForm({ initial, onSubmit, onCancel }: EmailAccountFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [fromName, setFromName] = useState(initial?.fromName ?? '');
  const [fromEmail, setFromEmail] = useState(initial?.fromEmail ?? '');
  const [smtpHost, setSmtpHost] = useState(initial?.smtpHost ?? '');
  const [smtpPort, setSmtpPort] = useState(String(initial?.smtpPort ?? 587));
  const [smtpUser, setSmtpUser] = useState(initial?.smtpUser ?? '');
  const [smtpPassword, setSmtpPassword] = useState('');

  const [handleSubmit, isSubmitting] = useSubmitGuard(async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      fromName: fromName || undefined,
      fromEmail,
      smtpHost,
      smtpPort: Number(smtpPort),
      smtpUser,
      smtpPassword,
    });
  });

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>Account name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Billing" required autoFocus />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>From name</label>
          <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="e.g. Company Billing" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>From email</label>
          <input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} required />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="form-group" style={{ flex: 2 }}>
          <label>SMTP host</label>
          <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.office365.com" required />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Port</label>
          <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} required />
        </div>
      </div>
      <div className="form-group">
        <label>SMTP username</label>
        <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>SMTP password{initial ? ' (leave blank to keep current)' : ''}</label>
        <input
          type="password"
          value={smtpPassword}
          onChange={(e) => setSmtpPassword(e.target.value)}
          placeholder={initial ? '••••••••' : ''}
          required={!initial}
        />
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

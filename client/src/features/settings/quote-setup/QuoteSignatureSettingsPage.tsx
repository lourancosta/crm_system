import { useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button/Button';
import { Select } from '../../../shared/components/Dropdown/Select';
import { SettingsCard } from '../../../shared/components/SettingsCard/SettingsCard';
import { quotesApi } from '../../quotes/api/quotes';
import { usersApi } from '../users/api/users';

type InternalUser = { id: string; firstName: string; lastName: string; email: string };

// Which internal user countersigns a quote on the company's behalf, once every
// required buyer contact has signed (see the wizard's Signature step and
// quote.service.ts's countersignQuote). Snapshotted onto each quote at
// publish time, so changing this only affects quotes published afterward.
export function QuoteSignatureSettingsPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [defaultSignerUserId, setDefaultSignerUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([usersApi.listInternal(), quotesApi.getSignerSetting()])
      .then(([userList, setting]) => {
        setUsers(userList);
        setDefaultSignerUserId(setting.defaultSignerUserId ?? '');
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSave() {
    setIsSaving(true);
    setError('');
    setSaved(false);
    try {
      await quotesApi.updateSignerSetting(defaultSignerUserId || null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      {!hideHeader && (
        <div className="page-header">
          <h1>Signature</h1>
        </div>
      )}
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Choose which internal user countersigns quotes on the company's behalf.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ maxWidth: 560, marginBottom: 16 }}>
        <SettingsCard title="Countersigner">
          <div className="settings-form">
            <div className="form-group">
              <label>Company countersigner</label>
              <Select
                value={defaultSignerUserId}
                onChange={(v) => {
                  setDefaultSignerUserId(v);
                  setSaved(false);
                }}
                options={[
                  { value: '', label: 'Not configured' },
                  ...users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })),
                ]}
                ariaLabel="Company countersigner"
              />
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                Once all required contacts sign a quote, this person is notified to countersign it. Changing this
                only affects quotes published afterward.
              </p>
            </div>
          </div>
        </SettingsCard>
      </div>

      <div className="settings-form-footer" style={{ maxWidth: 560 }}>
        <Button onClick={handleSave} disabled={isSaving || isLoading}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
        {saved && <span style={{ color: 'var(--primary)' }}>Saved</span>}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../shared/components/Button/Button';
import { SettingsCard } from '../../../shared/components/SettingsCard/SettingsCard';
import { quotesApi } from '../../quotes/api/quotes';

// Unlike InvoiceSetupPage (a read-only display of a computed value), this is
// a real save-able setting: an admin-configurable default expiration period,
// applied as publishedAt + this value once a quote is published (future work
// — this page just persists the number for that logic to read later).
export function QuoteSetupPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [days, setDays] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    quotesApi
      .getSettings()
      .then((s) => setDays(String(s.defaultExpirationDays)))
      .catch(() => setError('Failed to load settings'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSaved(false);
    try {
      const s = await quotesApi.updateSettings(Number(days));
      setDays(String(s.defaultExpirationDays));
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
          <h1>Setup</h1>
        </div>
      )}
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Configure how quotes behave once published.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSave}>
        <div style={{ maxWidth: 560, marginBottom: 16 }}>
          <SettingsCard title="Quote Settings">
            <div className="settings-form">
              <div className="form-group">
                <label>Default expiration period (days)</label>
                <input
                  type="number"
                  min={1}
                  value={days}
                  disabled={isLoading}
                  onChange={(e) => {
                    setDays(e.target.value);
                    setSaved(false);
                  }}
                />
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                  When a quote is published, its expiration date is set to the publish date plus this many days.
                </p>
              </div>
            </div>
          </SettingsCard>
        </div>

        <div className="settings-form-footer" style={{ maxWidth: 560 }}>
          <Button type="submit" disabled={isSaving || isLoading}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
          {saved && <span style={{ color: 'var(--primary)' }}>Saved</span>}
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button/Button';
import { SettingsCard } from '../../../shared/components/SettingsCard/SettingsCard';
import { accountDefaultsApi } from './api/accountDefaults';
import type { AccountDefaults } from './api/accountDefaults';
import styles from './AccountDefaultsPage.module.css';

const EMPTY: AccountDefaults = {
  companyName: '',
  companyDomain: '',
  address: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  bankName: '',
  bankRoutingNumber: '',
  bankSwiftCode: '',
  bankAccountNumber: '',
  billingContactEmail: '',
  bankAddress: '',
  bankAddress2: '',
  bankCity: '',
  bankState: '',
  bankZip: '',
  bankCountry: '',
};

type Tab = 'general' | 'bank';

// The app's own company info — admin-editable here, surfaced read-only
// wherever the app needs to represent "us" (e.g. the quote wizard's Your
// Info step, and the invoice template's "From"/"Payment Instructions"
// sections) instead of being hardcoded.
export function AccountDefaultsPage() {
  const [tab, setTab] = useState<Tab>('general');
  const [values, setValues] = useState<AccountDefaults>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    accountDefaultsApi
      .get()
      .then((d) => setValues({ ...EMPTY, ...d }))
      .catch(() => setSaveMsg('Failed to load'))
      .finally(() => setIsLoading(false));
  }, []);

  function set<K extends keyof AccountDefaults>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveMsg('');
    try {
      const updated = await accountDefaultsApi.update(values);
      setValues({ ...EMPTY, ...updated });
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch {
      setSaveMsg('Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Account Defaults</h1>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Your company's own info — used wherever the app needs to represent your company, like the sender details on
        a quote or the "From"/"Payment Instructions" sections of an invoice.
      </p>

      <div className="detail-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`detail-tab${tab === 'general' ? ' detail-tab--active' : ''}`}
          onClick={() => setTab('general')}
        >
          General
        </button>
        <button className={`detail-tab${tab === 'bank' ? ' detail-tab--active' : ''}`} onClick={() => setTab('bank')}>
          Bank
        </button>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ maxWidth: 560, marginBottom: 16, display: tab === 'general' ? 'block' : 'none' }}>
          <SettingsCard title="Company Information">
            <div className="settings-form">
              <div className="form-group">
                <label>Company name</label>
                <input value={values.companyName ?? ''} disabled={isLoading} onChange={(e) => set('companyName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Company domain</label>
                <input value={values.companyDomain ?? ''} disabled={isLoading} onChange={(e) => set('companyDomain', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input value={values.address ?? ''} disabled={isLoading} onChange={(e) => set('address', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Address line 2</label>
                <input value={values.address2 ?? ''} disabled={isLoading} onChange={(e) => set('address2', e.target.value)} />
              </div>
              <div className="form-group">
                <label>City</label>
                <input value={values.city ?? ''} disabled={isLoading} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="form-group">
                <label>State</label>
                <input value={values.state ?? ''} disabled={isLoading} onChange={(e) => set('state', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Zip</label>
                <input value={values.zip ?? ''} disabled={isLoading} onChange={(e) => set('zip', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input value={values.country ?? ''} disabled={isLoading} onChange={(e) => set('country', e.target.value)} />
              </div>
            </div>
          </SettingsCard>
        </div>

        <div style={{ maxWidth: 560, marginBottom: 16, display: tab === 'bank' ? 'block' : 'none' }}>
          <SettingsCard title="Information">
            <div className="settings-form">
              <div className="form-group">
                <label>Bank name</label>
                <input value={values.bankName ?? ''} disabled={isLoading} onChange={(e) => set('bankName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Routing number</label>
                <input value={values.bankRoutingNumber ?? ''} disabled={isLoading} onChange={(e) => set('bankRoutingNumber', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Swift code</label>
                <input value={values.bankSwiftCode ?? ''} disabled={isLoading} onChange={(e) => set('bankSwiftCode', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Account number</label>
                <input value={values.bankAccountNumber ?? ''} disabled={isLoading} onChange={(e) => set('bankAccountNumber', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Billing contact email</label>
                <input
                  type="email"
                  value={values.billingContactEmail ?? ''}
                  disabled={isLoading}
                  onChange={(e) => set('billingContactEmail', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input value={values.bankAddress ?? ''} disabled={isLoading} onChange={(e) => set('bankAddress', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Address 2</label>
                <input value={values.bankAddress2 ?? ''} disabled={isLoading} onChange={(e) => set('bankAddress2', e.target.value)} />
              </div>
              <div className="form-group">
                <label>City</label>
                <input value={values.bankCity ?? ''} disabled={isLoading} onChange={(e) => set('bankCity', e.target.value)} />
              </div>
              <div className="form-group">
                <label>State/Province</label>
                <input value={values.bankState ?? ''} disabled={isLoading} onChange={(e) => set('bankState', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Zip</label>
                <input value={values.bankZip ?? ''} disabled={isLoading} onChange={(e) => set('bankZip', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input value={values.bankCountry ?? ''} disabled={isLoading} onChange={(e) => set('bankCountry', e.target.value)} />
              </div>
            </div>
          </SettingsCard>
        </div>

        <div className="settings-form-footer" style={{ maxWidth: 560 }}>
          <Button type="submit" disabled={isSaving || isLoading}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
          {saveMsg && <span className={saveMsg === 'Saved' ? styles['save-success'] : styles['save-error']}>{saveMsg}</span>}
        </div>
      </form>
    </div>
  );
}

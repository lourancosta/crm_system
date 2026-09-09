import { Check } from 'lucide-react';
import { SettingsCard, SettingsCardBody } from '../../../shared/components/SettingsCard/SettingsCard';
import type { AssociatedCompany, AssociatedContact } from '../../../shared/types/index';
import styles from './BuyerInfoStep.module.css';

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span className={`${styles['check-box']}${checked ? ` ${styles['check-box--checked']}` : ''}`}>
      {checked && <Check size={14} color="#fff" strokeWidth={3} />}
    </span>
  );
}

type Props = {
  companies: AssociatedCompany[];
  contacts: AssociatedContact[];
  isLoading: boolean;
  selectedCompanyId: string | null;
  selectedContactIds: string[];
  onSelectCompany: (id: string) => void;
  onToggleContact: (id: string) => void;
};

export function BuyerInfoStep({
  companies,
  contacts,
  isLoading,
  selectedCompanyId,
  selectedContactIds,
  onSelectCompany,
  onToggleContact,
}: Props) {
  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading this deal's companies and contacts…</p>
      </div>
    );
  }

  const missingCompany = !selectedCompanyId;
  const missingContacts = selectedContactIds.length === 0;
  const alertMessage =
    missingCompany && missingContacts
      ? 'Please choose a company and select at least one contact to continue.'
      : missingCompany
        ? 'Please choose a company to continue.'
        : missingContacts
          ? 'Please select at least one contact to continue.'
          : '';

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 480 }}>
        <h2 style={{ marginBottom: 8 }}>Buyer Information</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          Select the buyer contact information that you would like to appear in the quote
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SettingsCard title="Company (choose one)" titleBackground="input" shadow>
            <SettingsCardBody>
              {companies.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>This deal has no associated companies.</p>
              ) : (
                companies.map((c) => (
                  <label key={c.id} className={styles['check-row']}>
                    <input
                      type="radio"
                      name="quote-buyer-company"
                      checked={selectedCompanyId === c.id}
                      onChange={() => onSelectCompany(c.id)}
                      className={styles['check-input']}
                    />
                    <CheckBox checked={selectedCompanyId === c.id} />
                    <span>
                      {c.name ?? 'Unnamed company'}
                      {c.domain ? ` — ${c.domain}` : ''}
                    </span>
                  </label>
                ))
              )}
            </SettingsCardBody>
          </SettingsCard>
          <SettingsCard title="Contacts (choose at least one)" titleBackground="input" shadow>
            <SettingsCardBody>
              {contacts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>This deal has no associated contacts.</p>
              ) : (
                contacts.map((c) => (
                  <label key={c.id} className={styles['check-row']}>
                    <input
                      type="checkbox"
                      checked={selectedContactIds.includes(c.id)}
                      onChange={() => onToggleContact(c.id)}
                      className={styles['check-input']}
                    />
                    <CheckBox checked={selectedContactIds.includes(c.id)} />
                    <span>
                      {[c.firstname, c.lastname].filter(Boolean).join(' ') || 'Unnamed contact'}
                      {c.email ? ` — ${c.email}` : ''}
                    </span>
                  </label>
                ))
              )}
            </SettingsCardBody>
          </SettingsCard>
          {alertMessage && <div className="alert alert-warning">{alertMessage}</div>}
        </div>
      </div>
    </div>
  );
}

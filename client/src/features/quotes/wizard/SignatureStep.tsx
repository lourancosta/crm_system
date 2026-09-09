import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { SettingsCard, SettingsCardBody } from '../../../shared/components/SettingsCard/SettingsCard';
import { Select } from '../../../shared/components/Dropdown/Select';
import { quotesApi } from '../api/quotes';
import { usersApi } from '../../settings/users/api/users';
import type { AssociatedContact } from '../../../shared/types/index';
import styles from './BuyerInfoStep.module.css';

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span className={`${styles['check-box']}${checked ? ` ${styles['check-box--checked']}` : ''}`}>
      {checked && <Check size={14} color="#fff" strokeWidth={3} />}
    </span>
  );
}

type InternalUser = { id: string; firstName: string; lastName: string; email: string };

type Props = {
  buyerContacts: AssociatedContact[];
  selectedSignerContactIds: string[];
  onToggleSignerContact: (id: string) => void;
  selectedSignerUserId: string | null;
  onChangeSignerUserId: (userId: string | null) => void;
};

export function SignatureStep({
  buyerContacts,
  selectedSignerContactIds,
  onToggleSignerContact,
  selectedSignerUserId,
  onChangeSignerUserId,
}: Props) {
  const [defaultSignerName, setDefaultSignerName] = useState<string | null>(null);
  const [internalUsers, setInternalUsers] = useState<InternalUser[]>([]);
  const [isLoadingSetting, setIsLoadingSetting] = useState(true);

  useEffect(() => {
    Promise.all([quotesApi.getSignerSetting(), usersApi.listInternal()])
      .then(([s, users]) => {
        setDefaultSignerName(s.defaultSignerName);
        setInternalUsers(users);
      })
      .finally(() => setIsLoadingSetting(false));
  }, []);

  return (
    <div style={{ width: 480 }}>
      <h2 style={{ marginBottom: 8 }}>Signature</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        Optional — choose which of this quote's contacts must sign it before it's considered accepted. Each one gets
        their own emailed link. Leave this unchecked if the customer hasn't decided which of several quotes they'll
        sign yet.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SettingsCard title="Contacts required to sign" titleBackground="input" shadow>
          <SettingsCardBody>
            {buyerContacts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                No contacts selected in Buyer Information yet.
              </p>
            ) : (
              buyerContacts.map((c) => (
                <label key={c.id} className={styles['check-row']}>
                  <input
                    type="checkbox"
                    checked={selectedSignerContactIds.includes(c.id)}
                    onChange={() => onToggleSignerContact(c.id)}
                    className={styles['check-input']}
                  />
                  <CheckBox checked={selectedSignerContactIds.includes(c.id)} />
                  <span>
                    {[c.firstname, c.lastname].filter(Boolean).join(' ') || 'Unnamed contact'}
                    {c.email ? ` — ${c.email}` : ''}
                  </span>
                </label>
              ))
            )}
          </SettingsCardBody>
        </SettingsCard>

        <SettingsCard title="Company countersigner" titleBackground="input" shadow>
          <SettingsCardBody>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>
              {isLoadingSetting
                ? 'Loading…'
                : defaultSignerName
                  ? `Standard countersigner: ${defaultSignerName} (Settings > Objects > Quote > Signature). Override it below if a different team member needs to sign this specific quote.`
                  : 'No standard countersigner is configured yet — set one in Settings > Objects > Quote > Signature, or pick one just for this quote below.'}
            </p>
            <Select
              value={selectedSignerUserId ?? ''}
              onChange={(v) => onChangeSignerUserId(v || null)}
              options={[
                { value: '', label: defaultSignerName ? `Use standard (${defaultSignerName})` : 'Use standard (not configured)' },
                ...internalUsers.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })),
              ]}
              ariaLabel="Company countersigner"
            />
          </SettingsCardBody>
        </SettingsCard>
      </div>
    </div>
  );
}

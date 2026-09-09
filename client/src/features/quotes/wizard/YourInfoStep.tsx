import { SettingsCard, SettingsCardBody } from '../../../shared/components/SettingsCard/SettingsCard';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useAvatarSrc } from '../../../shared/hooks/useAvatarSrc';
import type { AccountDefaults } from '../../settings/account-defaults/api/accountDefaults';
import styles from './YourInfoStep.module.css';

export type SenderInfo = {
  firstname: string;
  lastname: string;
  jobtitle: string;
  email: string;
  phone: string;
  companyName: string;
};

type Props = {
  sender: SenderInfo;
  company: AccountDefaults | null;
};

function companyAddressLine(company: AccountDefaults): string {
  const stateZip = [company.state, company.zip].filter(Boolean).join(' ');
  const cityStateZip = [company.city, stateZip].filter(Boolean).join(', ');
  return [company.address, company.address2, cityStateZip, company.country].filter(Boolean).join(', ');
}

const textStackStyle = { display: 'flex', flexDirection: 'column' as const, gap: 4, fontSize: 14, color: 'var(--text)' };

export function YourInfoStep({ sender, company }: Props) {
  const { user } = useAuth();
  const avatarSrc = useAvatarSrc(user?.avatarUrl);
  const initial = sender.firstname ? sender.firstname[0].toUpperCase() : '';
  const address = company ? companyAddressLine(company) : '';

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 480 }}>
        <h2 style={{ marginBottom: 8 }}>Your Information</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          Check the information about you and your company that will appear on the quote
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SettingsCard title="Quote Sender" titleBackground="input" shadow>
            <SettingsCardBody>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className={styles['sender-avatar']}>
                  {avatarSrc ? <img src={avatarSrc} alt="" className={styles['sender-avatar-image']} /> : initial}
                </div>
                <div style={textStackStyle}>
                  <div className={styles['sender-name']}>
                    {[sender.firstname, sender.lastname].filter(Boolean).join(' ') || '—'}
                  </div>
                  {sender.jobtitle && <div>{sender.jobtitle}</div>}
                  {sender.email && <div>{sender.email}</div>}
                  {sender.phone && <div>{sender.phone}</div>}
                </div>
              </div>
            </SettingsCardBody>
          </SettingsCard>

          <SettingsCard title="Your Company" titleBackground="input" shadow>
            <SettingsCardBody>
              <div style={textStackStyle}>
                <div>{sender.companyName || '—'}</div>
                {address && <div>{address}</div>}
              </div>
            </SettingsCardBody>
          </SettingsCard>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
          Pulled from your user profile and Settings &gt; Account Management &gt; Account Defaults.
        </p>
      </div>
    </div>
  );
}

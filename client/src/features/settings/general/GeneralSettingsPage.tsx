import { useState } from 'react';
import { ProfileTab } from './ProfileTab';
import { PasswordTab } from './PasswordTab';

type Tab = 'profile' | 'password';

export function GeneralSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div>
      <div className="page-header">
        <h1>General</h1>
      </div>

      <div className="detail-tabs">
        <button
          className={`detail-tab${activeTab === 'profile' ? ' detail-tab--active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`detail-tab${activeTab === 'password' ? ' detail-tab--active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          Password
        </button>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '12px 0 16px' }}>
        This applies across all CRM options.
      </p>

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'password' && <PasswordTab />}
    </div>
  );
}

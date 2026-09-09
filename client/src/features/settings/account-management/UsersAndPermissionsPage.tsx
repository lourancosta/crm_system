import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { UsersPage } from '../users/UsersPage';
import { PermissionSetsPage } from '../permission-sets/PermissionSetsPage';

type Tab = 'users' | 'permissions';

export function UsersAndPermissionsPage() {
  const location = useLocation();
  const initialTab = (location.state as { tab?: Tab } | null)?.tab ?? 'users';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  return (
    <div>
      <div className="page-header">
        <h1>Users &amp; Permission</h1>
      </div>

      <div className="detail-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`detail-tab${activeTab === 'users' ? ' detail-tab--active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`detail-tab${activeTab === 'permissions' ? ' detail-tab--active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permission
        </button>
      </div>

      {activeTab === 'users' ? <UsersPage hideHeader /> : <PermissionSetsPage hideHeader />}
    </div>
  );
}

import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { UserDetailPage } from './users/UserDetailPage';
import { UsersPage } from './users/UsersPage';
import { UsersAndPermissionsPage } from './account-management/UsersAndPermissionsPage';
import { AccountDefaultsPage } from './account-defaults/AccountDefaultsPage';
import { GeneralSettingsPage } from './general/GeneralSettingsPage';
import { ObjectsPage } from './objects/ObjectsPage';
import { PropertiesPage } from './properties/PropertiesPage';
import { SnippetsPage } from './snippets/SnippetsPage';
import { KnowledgeBaseSettingsPage } from '../knowledge-base/KnowledgeBaseSettingsPage';
import { EmailAccountsPage } from './email-accounts/EmailAccountsPage';
import { GoogleStorageSettingsPage } from './google-storage/GoogleStorageSettingsPage';
import { useAuth } from '../../shared/contexts/AuthContext';
import styles from './SettingsPage.module.css';

type SettingsNavItem =
  | { type: 'link'; to: string; label: string }
  | { type: 'group'; label: string; items: { to: string; label: string }[] };

// "Your Preferences" is every user's own account settings — the one group
// every login gets, admin or not, internal or portal — so it's the default
// landing tab within Settings for everyone (see the index route below).
const YOUR_PREFERENCES_GROUP: SettingsNavItem = {
  type: 'group',
  label: 'Your Preferences',
  items: [{ to: '/settings/general', label: 'General' }],
};

// Users & Permission is admin-only (resolved via the caller's 'users' module
// grant, same check the backend enforces) — everyone else manages their own
// info through Your Preferences > General > Profile instead.
function internalNavItems(canManageUsers: boolean): SettingsNavItem[] {
  const accountManagementItems = [{ to: '/settings/account-defaults', label: 'Account Defaults' }];
  if (canManageUsers) accountManagementItems.push({ to: '/settings/users-permissions', label: 'Users & Permission' });

  return [
    YOUR_PREFERENCES_GROUP,
    { type: 'group', label: 'Account Management', items: accountManagementItems },
    {
      type: 'group',
      label: 'Data Management',
      items: [
        { to: '/settings/objects', label: 'Objects' },
        { to: '/settings/properties', label: 'Properties' },
        { to: '/settings/knowledge-base', label: 'Knowledge Base' },
        { to: '/settings/snippets', label: 'Snippets' },
      ],
    },
    {
      type: 'group',
      label: 'Tools',
      items: [
        { to: '/settings/email-accounts', label: 'Email Accounts' },
        { to: '/settings/file-storage', label: 'File Storage' },
      ],
    },
  ];
}

// Partner/customer logins only get their own Users (invite teammates) plus
// Your Preferences — every other tab here is internal-only configuration.
const PORTAL_NAV_ITEMS: SettingsNavItem[] = [
  YOUR_PREFERENCES_GROUP,
  { type: 'link', to: '/settings/users', label: 'Users' },
];

function NavLinkItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${styles['settings-aside-item']}${isActive ? ` ${styles['settings-aside-item--active']}` : ''}`
      }
    >
      {label}
    </NavLink>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const isInternal = user?.accountType === 'internal';
  const canManageUsers = Boolean(user?.canManageUsers);
  const navItems = isInternal ? internalNavItems(canManageUsers) : PORTAL_NAV_ITEMS;

  return (
    <div className={styles['settings-layout']}>
      <nav className={styles['settings-aside-nav']}>
        {navItems.map((item) =>
          item.type === 'link' ? (
            <NavLinkItem key={item.to} to={item.to} label={item.label} />
          ) : (
            // Grouped like the main sidebar's nav groups, but statically
            // expanded — no hover flyout — since Settings has room for a
            // full nested list instead of a flyout menu.
            <div key={item.label} className={styles['settings-aside-group']}>
              <div className={styles['settings-aside-group-label']}>{item.label}</div>
              {item.items.map((sub) => (
                <NavLinkItem key={sub.to} to={sub.to} label={sub.label} />
              ))}
            </div>
          ),
        )}
      </nav>

      <div className={styles['settings-main']}>
        <Routes>
          <Route index element={<Navigate to="/settings/general" replace />} />
          <Route path="general" element={<GeneralSettingsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          {isInternal && (
            <>
              {canManageUsers && <Route path="users-permissions" element={<UsersAndPermissionsPage />} />}
              <Route path="account-defaults" element={<AccountDefaultsPage />} />
              <Route path="objects" element={<ObjectsPage />} />
              <Route path="properties" element={<PropertiesPage />} />
              <Route path="knowledge-base" element={<KnowledgeBaseSettingsPage />} />
              <Route path="snippets" element={<SnippetsPage />} />
              <Route path="email-accounts" element={<EmailAccountsPage />} />
              <Route path="file-storage" element={<GoogleStorageSettingsPage />} />
            </>
          )}
        </Routes>
      </div>
    </div>
  );
}

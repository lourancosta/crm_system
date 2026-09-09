import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usersApi } from './api/users';
import { ApiError } from '../../../shared/api/client';
import { permissionSetsApi } from '../permission-sets/api/permissionSets';
import { companiesApi } from '../../companies/api/companies';
import { Button } from '../../../shared/components/Button/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog/ConfirmDialog';
import { Select } from '../../../shared/components/Dropdown/Select';
import { CompanySearchSelect } from '../../../shared/components/SearchSelect/CompanySearchSelect';
import { SettingsCard } from '../../../shared/components/SettingsCard/SettingsCard';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ACCOUNT_TYPES } from '../../../shared/types/index';
import type { AccountType, Company, PermissionSetWithModules, PortalRole, User } from '../../../shared/types/index';
import recordDetailStyles from '../../../shared/components/RecordDetail/RecordDetail.module.css';
import styles from './UserDetailPage.module.css';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = { internal: 'Internal', partner: 'Partner', customer: 'Customer' };
const ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPES.map((t) => ({ value: t, label: ACCOUNT_TYPE_LABELS[t] }));

// Only meaningful for accountType partner/customer — internal users are
// governed by permissionSetId instead (see src/lib/permissions.ts).
const ROLE_LABELS: Record<PortalRole, string> = {
  partner_admin: 'Partner Admin',
  partner_user: 'Partner User',
  partner_billing: 'Partner Billing',
  customer_admin: 'Customer Admin',
  customer_user: 'Customer User',
};

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const usersListPath = currentUser?.accountType === 'internal' ? '/settings/users-permissions' : '/settings/users';

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('internal');
  const [role, setRole] = useState<PortalRole>('partner_user');
  const [company, setCompany] = useState<Company | null>(null);
  const [permissionSetId, setPermissionSetId] = useState('');
  const [permissionSets, setPermissionSets] = useState<PermissionSetWithModules[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const canEditAccountType = currentUser?.accountType === 'internal';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [isResendingInvite, setIsResendingInvite] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    usersApi
      .getById(id)
      .then((u: User) => {
        setUser(u);
        setFirstName(u.firstName);
        setLastName(u.lastName);
        setEmail(u.email);
        setJobTitle(u.jobTitle ?? '');
        setPhone(u.phone ?? '');
        setAccountType(u.accountType);
        setRole(u.role as PortalRole);
        setPermissionSetId(u.permissionSetId ?? '');
        if (u.companyId) companiesApi.getById(u.companyId).then(setCompany);
      })
      .catch(() => setError('User not found'))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (accountType !== 'internal') return;
    permissionSetsApi.list().then(setPermissionSets);
  }, [accountType]);

  function handleAccountTypeChange(next: AccountType) {
    setAccountType(next);
    setRole(next === 'customer' ? 'customer_user' : 'partner_user');
    setCompany(null);
  }

  const canSubmit = accountType === 'internal' || Boolean(company);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !canSubmit) return;
    setIsSaving(true);
    setSaveMsg('');
    try {
      const basePayload = canEditAccountType
        ? { firstName, lastName, email, jobTitle, phone, accountType }
        : { firstName, lastName, email, jobTitle, phone };
      const updated =
        accountType === 'internal'
          ? await usersApi.update(id, { ...basePayload, permissionSetId: permissionSetId || null })
          : await usersApi.update(id, { ...basePayload, role, companyId: company!.id });
      setUser(updated);
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch {
      setSaveMsg('Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (!id) return;
    setIsChangingPw(true);
    setPwMsg('');
    try {
      await usersApi.update(id, { password: newPassword });
      setNewPassword('');
      setConfirmPassword('');
      setPwMsg('Password updated');
      setTimeout(() => setPwMsg(''), 2500);
    } catch {
      setPwMsg('Failed to update password');
    } finally {
      setIsChangingPw(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    await usersApi.delete(id);
    navigate(usersListPath);
  }

  async function handleResendInvite() {
    if (!id) return;
    setIsResendingInvite(true);
    setInviteMsg('');
    try {
      const result = await usersApi.resendInvite(id);
      setInviteMsg(result.inviteSent ? 'Invite sent' : "Couldn't send the invite email — check Settings > Email Accounts.");
    } catch (err) {
      setInviteMsg(err instanceof ApiError ? err.message : 'Failed to resend invite');
    } finally {
      setIsResendingInvite(false);
    }
  }

  if (isLoading) {
    return <div className="loading">Loading…</div>;
  }

  if (error || !user) {
    return <div className="alert alert-error">{error || 'User not found'}</div>;
  }

  return (
    <div>
      <Link to={usersListPath} className={recordDetailStyles['record-back']}>← Users</Link>

      <div className="page-header" style={{ marginTop: 12 }}>
        <h1>{user.firstName} {user.lastName}</h1>
      </div>

      {!user.passwordSetAt && (
        <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>Invite pending — this user hasn't set their password yet.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {inviteMsg && <span style={{ fontSize: 12 }}>{inviteMsg}</span>}
            <Button type="button" size="sm" variant="secondary" onClick={handleResendInvite} isLoading={isResendingInvite}>
              Resend Invite
            </Button>
          </div>
        </div>
      )}

      {/* Edit info */}
      <div style={{ maxWidth: 560, marginBottom: 16 }}>
      <SettingsCard title="User Information">
        <form onSubmit={handleSave} className="settings-form">
          <div className="form-group">
            <label>First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Job title</label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {canEditAccountType && (
            <div className="form-group">
              <label>Account type</label>
              <Select
                value={accountType}
                onChange={(v) => handleAccountTypeChange(v as AccountType)}
                options={ACCOUNT_TYPE_OPTIONS}
                ariaLabel="Account type"
              />
            </div>
          )}
          {accountType === 'internal' ? (
            <div className="form-group">
              <label>Permission set</label>
              <Select
                value={permissionSetId}
                onChange={setPermissionSetId}
                options={[
                  { value: '', label: 'Select a permission set…' },
                  ...permissionSets.map((p) => ({ value: p.id, label: p.name })),
                ]}
                ariaLabel="Permission set"
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Role</label>
                <Select
                  value={role}
                  onChange={(v) => setRole(v as PortalRole)}
                  options={(accountType === 'customer'
                    ? (['customer_admin', 'customer_user'] as const)
                    : (['partner_admin', 'partner_user', 'partner_billing'] as const)
                  ).map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                  ariaLabel="Role"
                />
              </div>
              {canEditAccountType && (
                <div className="form-group">
                  <label>Company</label>
                  <CompanySearchSelect value={company} onChange={setCompany} type={accountType} />
                </div>
              )}
            </>
          )}
          <div className="settings-form-footer">
            <Button type="submit" disabled={isSaving || !canSubmit}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
            {saveMsg && (
              <span className={saveMsg === 'Saved' ? styles['save-success'] : styles['save-error']}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      </SettingsCard>
      </div>

      {/* Change password */}
      <div style={{ maxWidth: 560, marginBottom: 16 }}>
      <SettingsCard title="Change Password">
        <form onSubmit={handlePasswordChange} className="settings-form">
          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="form-group">
            <label>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {passwordError && <p className={styles['save-error']}>{passwordError}</p>}
          <div className="settings-form-footer">
            <Button type="submit" disabled={isChangingPw}>
              {isChangingPw ? 'Updating…' : 'Update password'}
            </Button>
            {pwMsg && (
              <span className={pwMsg === 'Password updated' ? styles['save-success'] : styles['save-error']}>
                {pwMsg}
              </span>
            )}
          </div>
        </form>
      </SettingsCard>
      </div>

      {/* Danger zone */}
      <div style={{ maxWidth: 560, marginBottom: 16 }}>
      <SettingsCard title="Danger Zone" variant="danger">
        <div className={styles['settings-danger-row']}>
          <div>
            <div className={styles['settings-danger-label']}>Delete user</div>
            <div className={styles['settings-danger-desc']}>
              Permanently remove this user. This action cannot be undone.
            </div>
          </div>
          <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </SettingsCard>
      </div>

      {isDeleteOpen && (
        <ConfirmDialog
          title="Delete User?"
          message={`You are about to delete ${`${user.firstName} ${user.lastName}`.trim() || 'this user'}. This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </div>
  );
}

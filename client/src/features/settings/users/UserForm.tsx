import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../shared/components/Button/Button';
import { Select } from '../../../shared/components/Dropdown/Select';
import { CompanySearchSelect } from '../../../shared/components/SearchSelect/CompanySearchSelect';
import { useSubmitGuard } from '../../../shared/hooks/useSubmitGuard';
import { permissionSetsApi } from '../permission-sets/api/permissionSets';
import { ACCOUNT_TYPES, PORTAL_ROLES } from '../../../shared/types/index';
import type { AccountType, Company, PermissionSetWithModules, PortalRole } from '../../../shared/types/index';
import type { CreateUserInput } from './api/users';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = { internal: 'Internal', partner: 'Partner', customer: 'Customer' };
const ROLE_LABELS: Record<PortalRole, string> = {
  partner_admin: 'Partner Admin',
  partner_user: 'Partner User',
  partner_billing: 'Partner Billing',
  customer_admin: 'Customer Admin',
  customer_user: 'Customer User',
};

// Only the internal accountType is always available — a caller who isn't
// internal (a partner/customer admin inviting a teammate) is restricted to
// their own accountType by the backend regardless of what this form offers,
// so this list is deliberately the full set; the API 403s anything not allowed.
const ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPES.map((t) => ({ value: t, label: ACCOUNT_TYPE_LABELS[t] }));

type UserFormProps = {
  onSubmit: (input: CreateUserInput) => void;
  onCancel: () => void;
};

export function UserForm({ onSubmit, onCancel }: UserFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('internal');
  const [permissionSetId, setPermissionSetId] = useState('');
  const [role, setRole] = useState<PortalRole>('partner_user');
  const [company, setCompany] = useState<Company | null>(null);
  const [permissionSets, setPermissionSets] = useState<PermissionSetWithModules[]>([]);

  useEffect(() => {
    permissionSetsApi.list().then(setPermissionSets);
  }, []);

  const roleOptions = (accountType === 'customer' ? PORTAL_ROLES.filter((r) => r.startsWith('customer_')) : PORTAL_ROLES.filter((r) => r.startsWith('partner_'))).map(
    (r) => ({ value: r, label: ROLE_LABELS[r] }),
  );

  const canSubmit = accountType === 'internal' || Boolean(company);

  const [handleSubmit, isSubmitting] = useSubmitGuard(async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const input: CreateUserInput =
      accountType === 'internal'
        ? { firstName, lastName, email, accountType, jobTitle, phone, permissionSetId: permissionSetId || undefined }
        : { firstName, lastName, email, accountType, jobTitle, phone, role, companyId: company!.id };
    await onSubmit(input);
  });

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>First name</label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus />
      </div>
      <div className="form-group">
        <label>Last name</label>
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Job title</label>
        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Account type</label>
        <Select
          value={accountType}
          onChange={(v) => {
            setAccountType(v);
            setRole(v === 'customer' ? 'customer_user' : 'partner_user');
            setCompany(null);
          }}
          options={ACCOUNT_TYPE_OPTIONS}
        />
      </div>

      {accountType === 'internal' ? (
        <div className="form-group">
          <label>Permission set</label>
          <Select
            value={permissionSetId}
            onChange={setPermissionSetId}
            options={[{ value: '', label: 'Select a permission set…' }, ...permissionSets.map((p) => ({ value: p.id, label: p.name }))]}
          />
        </div>
      ) : (
        <>
          <div className="form-group">
            <label>Role</label>
            <Select value={role} onChange={(v) => setRole(v as PortalRole)} options={roleOptions} />
          </div>
          <div className="form-group">
            <label>Company</label>
            <CompanySearchSelect value={company} onChange={setCompany} type={accountType} />
          </div>
        </>
      )}

      <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
        An invite email will be sent so this person can set their own password.
      </p>

      <div className="settings-form-footer">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit} isLoading={isSubmitting}>
          Create
        </Button>
      </div>
    </form>
  );
}

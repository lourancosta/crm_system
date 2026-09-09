import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { emailAccountsApi } from './api/emailAccounts';
import { Button } from '../../../shared/components/Button/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog/ConfirmDialog';
import { EmailAccountForm } from './EmailAccountForm';
import { Modal } from '../../../shared/components/Modal/Modal';
import { RowActionsMenu } from '../../../shared/components/Dropdown/RowActionsMenu';
import { Select } from '../../../shared/components/Dropdown/Select';
import { Table } from '../../../shared/components/Table/Table';
import type { Column } from '../../../shared/components/Table/Table';
import { EMAIL_FEATURES } from '../../../shared/types/index';
import type { CreateEmailAccountInput, EmailAccount, EmailFeature, FeatureAssignment } from '../../../shared/types/index';

const FEATURE_LABELS: Record<EmailFeature, string> = {
  invoice_reminders: 'Invoice reminders',
  password_reset: 'Password reset',
  user_invite: 'User invites',
  quote_signature_request: 'Quote signature requests',
  quote_countersign_request: 'Quote countersignature requests',
};

const FEATURE_DESCRIPTIONS: Record<EmailFeature, string> = {
  invoice_reminders: 'Sends automated reminder emails when invoices are approaching or past their due date.',
  password_reset: 'Sends the password reset link when a user requests one.',
  user_invite: 'Sends the initial invite email when a new user account is created.',
  quote_signature_request: 'Sends the signature request email when a quote is published for a buyer to sign.',
  quote_countersign_request: 'Sends the internal countersignature request once all buyer signatures are collected.',
};

type Tab = 'accounts' | 'assignments';

export function EmailAccountsPage() {
  const [tab, setTab] = useState<Tab>('accounts');
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<EmailAccount | null>(null);
  const [assignments, setAssignments] = useState<FeatureAssignment[]>([]);

  function load() {
    setIsLoading(true);
    emailAccountsApi
      .list()
      .then(setAccounts)
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);
  useEffect(() => {
    emailAccountsApi.getFeatureAssignments().then(setAssignments);
  }, []);

  async function handleAssignmentChange(feature: EmailFeature, emailAccountId: string) {
    setAssignments((prev) => {
      const next = prev.filter((a) => a.feature !== feature);
      return [...next, { feature, emailAccountId: emailAccountId || null }];
    });
    await emailAccountsApi.setFeatureAssignment(feature, emailAccountId || null);
  }

  async function handleCreate(input: CreateEmailAccountInput) {
    await emailAccountsApi.create(input);
    setShowCreate(false);
    load();
  }

  async function handleUpdate(input: CreateEmailAccountInput) {
    if (!editingAccount) return;
    const { smtpPassword, ...rest } = input;
    await emailAccountsApi.update(editingAccount.id, { ...rest, ...(smtpPassword ? { smtpPassword } : {}) });
    setEditingAccount(null);
    load();
  }

  async function handleDelete() {
    if (!deletingAccount) return;
    await emailAccountsApi.delete(deletingAccount.id);
    setDeletingAccount(null);
    load();
  }

  const columns: Column<EmailAccount>[] = [
    {
      key: 'name',
      header: 'Account',
      render: (a) => (
        <div>
          <div style={{ fontWeight: 600 }}>{a.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {a.fromName ? `${a.fromName} <${a.fromEmail}>` : a.fromEmail}
          </div>
        </div>
      ),
    },
    { key: 'smtpHost', header: 'SMTP host', render: (a) => `${a.smtpHost}:${a.smtpPort}` },
    { key: 'smtpUser', header: 'SMTP username', render: (a) => a.smtpUser },
    {
      key: 'actions',
      header: 'Actions',
      render: (a) => (
        <RowActionsMenu
          actions={[
            { label: 'Edit', icon: Pencil, onClick: () => setEditingAccount(a) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeletingAccount(a), variant: 'danger' },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Email Accounts</h1>
        {tab === 'accounts' && <Button onClick={() => setShowCreate(true)}>+ New Account</Button>}
      </div>

      <div className="detail-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`detail-tab${tab === 'accounts' ? ' detail-tab--active' : ''}`}
          onClick={() => setTab('accounts')}
        >
          Accounts
        </button>
        <button
          className={`detail-tab${tab === 'assignments' ? ' detail-tab--active' : ''}`}
          onClick={() => setTab('assignments')}
        >
          Feature Assignments
        </button>
      </div>

      {tab === 'accounts' && (
        <>
          <p style={{ color: 'var(--text-muted)', marginTop: -8, marginBottom: 16 }}>
            Real SMTP mailboxes used to send outgoing emails.
          </p>

          <Table
            columns={columns}
            data={accounts}
            keyExtractor={(a) => a.id}
            isLoading={isLoading}
            emptyMessage="No email accounts yet."
          />
        </>
      )}

      {tab === 'assignments' && (
        <>
          <p style={{ color: 'var(--text-muted)', marginTop: -8, marginBottom: 16 }}>
            Which account each feature sends from (invoice reminders can also be assigned from its own settings
            page).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {EMAIL_FEATURES.map((feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 24,
                  padding: '16px 20px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{FEATURE_LABELS[feature]}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    {FEATURE_DESCRIPTIONS[feature]}
                  </div>
                </div>
                <Select
                  value={assignments.find((a) => a.feature === feature)?.emailAccountId ?? ''}
                  onChange={(value) => handleAssignmentChange(feature, value)}
                  options={[
                    { value: '', label: 'Not configured' },
                    ...accounts.map((a) => ({ value: a.id, label: a.name })),
                  ]}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {showCreate && (
        <Modal title="New Email Account" onClose={() => setShowCreate(false)}>
          <EmailAccountForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {editingAccount && (
        <Modal title="Edit Email Account" onClose={() => setEditingAccount(null)}>
          <EmailAccountForm initial={editingAccount} onSubmit={handleUpdate} onCancel={() => setEditingAccount(null)} />
        </Modal>
      )}

      {deletingAccount && (
        <ConfirmDialog
          title="Delete Email Account?"
          message={`You are about to delete "${deletingAccount.name}". Any feature currently assigned to it will stop sending until reassigned.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingAccount(null)}
        />
      )}
    </div>
  );
}

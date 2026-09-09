import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { emailAccountsApi } from '../email-accounts/api/emailAccounts';
import { reminderRulesApi } from './api/reminderRules';
import { Button } from '../../../shared/components/Button/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog/ConfirmDialog';
import { Modal } from '../../../shared/components/Modal/Modal';
import { ReminderRuleForm } from './ReminderRuleForm';
import { RowActionsMenu } from '../../../shared/components/Dropdown/RowActionsMenu';
import { Select } from '../../../shared/components/Dropdown/Select';
import { Table } from '../../../shared/components/Table/Table';
import type { Column } from '../../../shared/components/Table/Table';
import type { CreateReminderRuleInput, EmailAccount, ReminderRule } from '../../../shared/types/index';

function StatusBadge({ enabled }: { enabled: boolean }) {
  const color = enabled ? '#16a34a' : '#9ca3af';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  );
}

export function InvoiceReminderRulesPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [sendingAccountId, setSendingAccountId] = useState('');
  const [deletingRule, setDeletingRule] = useState<ReminderRule | null>(null);

  function load() {
    setIsLoading(true);
    reminderRulesApi.list().then(setRules).finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    emailAccountsApi.list().then(setEmailAccounts);
    emailAccountsApi.getFeatureAssignments().then((assignments) => {
      const assignment = assignments.find((a) => a.feature === 'invoice_reminders');
      setSendingAccountId(assignment?.emailAccountId ?? '');
    });
  }, []);

  async function handleSendingAccountChange(value: string) {
    setSendingAccountId(value);
    await emailAccountsApi.setFeatureAssignment('invoice_reminders', value || null);
  }

  async function handleCreate(input: CreateReminderRuleInput) {
    await reminderRulesApi.create(input);
    setShowForm(false);
    load();
  }

  async function handleUpdate(input: CreateReminderRuleInput) {
    if (!editingRule) return;
    await reminderRulesApi.update(editingRule.id, input);
    setEditingRule(null);
    load();
  }

  async function handleDelete() {
    if (!deletingRule) return;
    await reminderRulesApi.delete(deletingRule.id);
    setDeletingRule(null);
    load();
  }

  const columns: Column<ReminderRule>[] = [
    { key: 'label', header: 'Label', render: (r) => <span style={{ fontWeight: 500 }}>{r.label}</span> },
    { key: 'daysBeforeTrigger', header: 'Days before due', render: (r) => r.daysBeforeTrigger },
    { key: 'enabled', header: 'Status', render: (r) => <StatusBadge enabled={r.enabled} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <RowActionsMenu
          actions={[
            { label: 'Edit', icon: Pencil, onClick: () => setEditingRule(r) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeletingRule(r), variant: 'danger' },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        {hideHeader ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Configure when reminder emails go out relative to an invoice's due date. Each rule fires once per
            invoice, the first time the due date comes within its configured window.
          </p>
        ) : (
          <h1>Invoice Reminders</h1>
        )}
        <Button onClick={() => setShowForm(true)}>+ New Rule</Button>
      </div>

      {!hideHeader && (
        <p style={{ color: 'var(--text-muted)', marginTop: -8, marginBottom: 16 }}>
          Configure when reminder emails go out relative to an invoice's due date. Each rule fires once per
          invoice, the first time the due date comes within its configured window.
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Sending account</span>
        <Select
          value={sendingAccountId}
          onChange={handleSendingAccountChange}
          options={[
            { value: '', label: 'Not configured — reminders won’t send' },
            ...emailAccounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <Link to="/settings/email-accounts" className="link" style={{ fontSize: 13 }}>
          Manage email accounts
        </Link>
      </div>

      <Table
        columns={columns}
        data={rules}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No reminder rules configured."
      />

      {showForm && (
        <Modal title="New Reminder Rule" onClose={() => setShowForm(false)}>
          <ReminderRuleForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </Modal>
      )}

      {editingRule && (
        <Modal title="Edit Reminder Rule" onClose={() => setEditingRule(null)}>
          <ReminderRuleForm
            initial={editingRule}
            onSubmit={handleUpdate}
            onCancel={() => setEditingRule(null)}
          />
        </Modal>
      )}

      {deletingRule && (
        <ConfirmDialog
          title="Delete Reminder Rule?"
          message={`You are about to delete "${deletingRule.label}". This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingRule(null)}
        />
      )}
    </div>
  );
}

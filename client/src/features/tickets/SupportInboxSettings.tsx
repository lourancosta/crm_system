import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { supportInboxApi } from './api/supportInbox';
import { Button } from '../../shared/components/Button/Button';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { Modal } from '../../shared/components/Modal/Modal';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import { SupportInboxForm } from './SupportInboxForm';
import { Table } from '../../shared/components/Table/Table';
import type { Column } from '../../shared/components/Table/Table';
import type { CreateSupportInboxInput, SupportInbox } from '../../shared/types/index';

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

export function SupportInboxSettings() {
  const [inboxes, setInboxes] = useState<SupportInbox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingInbox, setEditingInbox] = useState<SupportInbox | null>(null);
  const [deletingInbox, setDeletingInbox] = useState<SupportInbox | null>(null);

  function load() {
    setIsLoading(true);
    supportInboxApi.list().then(setInboxes).finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(input: CreateSupportInboxInput) {
    await supportInboxApi.create(input);
    setShowCreate(false);
    load();
  }

  async function handleUpdate(input: CreateSupportInboxInput) {
    if (!editingInbox) return;
    const { imapPassword, ...rest } = input;
    await supportInboxApi.update(editingInbox.id, { ...rest, ...(imapPassword ? { imapPassword } : {}) });
    setEditingInbox(null);
    load();
  }

  async function handleDelete() {
    if (!deletingInbox) return;
    await supportInboxApi.delete(deletingInbox.id);
    setDeletingInbox(null);
    load();
  }

  const columns: Column<SupportInbox>[] = [
    {
      key: 'name',
      header: 'Inbox',
      render: (i) => (
        <div>
          <div style={{ fontWeight: 600 }}>{i.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.imapUser}</div>
        </div>
      ),
    },
    { key: 'imapHost', header: 'IMAP host', render: (i) => `${i.imapHost}:${i.imapPort}` },
    { key: 'folder', header: 'Folder', render: (i) => i.folder },
    { key: 'enabled', header: 'Status', render: (i) => <StatusBadge enabled={i.enabled} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (i) => (
        <RowActionsMenu
          actions={[
            { label: 'Edit', icon: Pencil, onClick: () => setEditingInbox(i) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeletingInbox(i), variant: 'danger' },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <p style={{ color: 'var(--text-muted)', margin: 0, maxWidth: 560 }}>
          Every new email received in a connected inbox becomes a ticket in the pipeline/stage you choose (polled
          every few minutes). Replies on an existing thread are appended to that ticket instead of creating a new
          one.
        </p>
        <Button onClick={() => setShowCreate(true)}>+ Connect inbox</Button>
      </div>

      <Table
        columns={columns}
        data={inboxes}
        keyExtractor={(i) => i.id}
        isLoading={isLoading}
        emptyMessage="No support inboxes connected."
      />

      {showCreate && (
        <Modal title="Connect Support Inbox" onClose={() => setShowCreate(false)}>
          <SupportInboxForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {editingInbox && (
        <Modal title="Edit Support Inbox" onClose={() => setEditingInbox(null)}>
          <SupportInboxForm initial={editingInbox} onSubmit={handleUpdate} onCancel={() => setEditingInbox(null)} />
        </Modal>
      )}

      {deletingInbox && (
        <ConfirmDialog
          title="Disconnect Support Inbox?"
          message={`You are about to disconnect "${deletingInbox.name}". It will stop creating tickets from new email.`}
          confirmLabel="Disconnect"
          onConfirm={handleDelete}
          onCancel={() => setDeletingInbox(null)}
        />
      )}
    </div>
  );
}

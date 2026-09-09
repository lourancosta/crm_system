import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { snippetsApi } from './api/snippets';
import { Button } from '../../../shared/components/Button/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog/ConfirmDialog';
import { Modal } from '../../../shared/components/Modal/Modal';
import { RowActionsMenu } from '../../../shared/components/Dropdown/RowActionsMenu';
import { SnippetForm } from './SnippetForm';
import { Table } from '../../../shared/components/Table/Table';
import type { Column } from '../../../shared/components/Table/Table';
import type { CreateSnippetInput, Snippet } from '../../../shared/types/index';

export function SnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [deletingSnippet, setDeletingSnippet] = useState<Snippet | null>(null);

  function load() {
    setIsLoading(true);
    snippetsApi.list().then(setSnippets).finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(input: CreateSnippetInput) {
    await snippetsApi.create(input);
    setShowForm(false);
    load();
  }

  async function handleUpdate(input: CreateSnippetInput) {
    if (!editingSnippet) return;
    await snippetsApi.update(editingSnippet.id, input);
    setEditingSnippet(null);
    load();
  }

  async function handleDelete() {
    if (!deletingSnippet) return;
    await snippetsApi.delete(deletingSnippet.id);
    setDeletingSnippet(null);
    load();
  }

  const columns: Column<Snippet>[] = [
    { key: 'name', header: 'Name', render: (s) => <span style={{ fontWeight: 600 }}>{s.name}</span> },
    { key: 'updatedAt', header: 'Updated', render: (s) => new Date(s.updatedAt).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <RowActionsMenu
          actions={[
            { label: 'Edit', icon: Pencil, onClick: () => setEditingSnippet(s) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeletingSnippet(s), variant: 'danger' },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Snippets</h1>
        <Button onClick={() => setShowForm(true)}>+ New Snippet</Button>
      </div>
      <p style={{ color: 'var(--text-muted)', marginTop: -8, marginBottom: 16 }}>
        Reusable rich-text blocks reps can insert into a quote's "Comments to buyer" and "Purchase terms" fields
        instead of retyping the same boilerplate.
      </p>

      <Table
        columns={columns}
        data={snippets}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="No snippets yet."
      />

      {showForm && (
        <Modal title="New Snippet" onClose={() => setShowForm(false)}>
          <SnippetForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </Modal>
      )}

      {editingSnippet && (
        <Modal title="Edit Snippet" onClose={() => setEditingSnippet(null)}>
          <SnippetForm initial={editingSnippet} onSubmit={handleUpdate} onCancel={() => setEditingSnippet(null)} />
        </Modal>
      )}

      {deletingSnippet && (
        <ConfirmDialog
          title="Delete Snippet?"
          message={`You are about to delete "${deletingSnippet.name}". This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingSnippet(null)}
        />
      )}
    </div>
  );
}

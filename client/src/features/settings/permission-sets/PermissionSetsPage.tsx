import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { permissionSetsApi } from './api/permissionSets';
import { Button } from '../../../shared/components/Button/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog/ConfirmDialog';
import { Modal } from '../../../shared/components/Modal/Modal';
import { PermissionSetForm, PERMISSION_SET_FORM_ID } from './PermissionSetForm';
import { RowActionsMenu } from '../../../shared/components/Dropdown/RowActionsMenu';
import { Table } from '../../../shared/components/Table/Table';
import type { Column } from '../../../shared/components/Table/Table';
import { ApiError } from '../../../shared/api/client';
import type { CreatePermissionSetInput, PermissionSetWithModules } from '../../../shared/types/index';

export function PermissionSetsPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [sets, setSets] = useState<PermissionSetWithModules[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSet, setEditingSet] = useState<PermissionSetWithModules | null>(null);
  const [deletingSet, setDeletingSet] = useState<PermissionSetWithModules | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function load() {
    setIsLoading(true);
    permissionSetsApi
      .list()
      .then(setSets)
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(input: CreatePermissionSetInput) {
    await permissionSetsApi.create(input);
    setShowCreate(false);
    load();
  }

  async function handleUpdate(input: CreatePermissionSetInput) {
    if (!editingSet) return;
    await permissionSetsApi.update(editingSet.id, input);
    setEditingSet(null);
    load();
  }

  async function handleDelete() {
    if (!deletingSet) return;
    setDeleteError('');
    try {
      await permissionSetsApi.delete(deletingSet.id);
      setDeletingSet(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Failed to delete permission set');
    }
  }

  const columns: Column<PermissionSetWithModules>[] = [
    { key: 'name', header: 'Name', render: (s) => <span style={{ fontWeight: 600 }}>{s.name}</span> },
    {
      key: 'modules',
      header: 'Modules with access',
      render: (s) => s.modules.filter((m) => m.viewScope !== 'none').length,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <RowActionsMenu
          actions={[
            { label: 'Edit', icon: Pencil, onClick: () => setEditingSet(s) },
            { label: 'Delete', icon: Trash2, onClick: () => { setDeleteError(''); setDeletingSet(s); }, variant: 'danger' },
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
            Controls what internal users can see and do, per module. Assign a set to each user from their profile.
          </p>
        ) : (
          <h1>Permission Sets</h1>
        )}
        <Button onClick={() => setShowCreate(true)}>+ New Permission Set</Button>
      </div>

      <Table
        columns={columns}
        data={sets}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="No permission sets yet."
      />

      {showCreate && (
        <Modal
          title="New Permission Set"
          onClose={() => setShowCreate(false)}
          variant="medium"
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" form={PERMISSION_SET_FORM_ID} isLoading={isSubmitting}>
                Save
              </Button>
            </>
          }
        >
          <PermissionSetForm onSubmit={handleCreate} onSubmittingChange={setIsSubmitting} />
        </Modal>
      )}

      {editingSet && (
        <Modal
          title="Edit Permission Set"
          onClose={() => setEditingSet(null)}
          variant="medium"
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setEditingSet(null)}>
                Cancel
              </Button>
              <Button type="submit" form={PERMISSION_SET_FORM_ID} isLoading={isSubmitting}>
                Save
              </Button>
            </>
          }
        >
          <PermissionSetForm initial={editingSet} onSubmit={handleUpdate} onSubmittingChange={setIsSubmitting} />
        </Modal>
      )}

      {deletingSet && (
        <ConfirmDialog
          title="Delete Permission Set?"
          message={
            deleteError ||
            `You are about to delete "${deletingSet.name}". This will fail if any user is currently assigned to it.`
          }
          onConfirm={handleDelete}
          onCancel={() => setDeletingSet(null)}
        />
      )}
    </div>
  );
}

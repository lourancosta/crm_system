import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Info, Pencil, Trash2 } from 'lucide-react';
import { lifecycleStagesApi } from '../../api/lifecycleStages';
import { Button } from '../Button/Button';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { Modal } from '../Modal/Modal';
import { RowActionsMenu } from '../Dropdown/RowActionsMenu';
import { Table } from '../Table/Table';
import type { Column } from '../Table/Table';
import { dragHandleColumn } from '../Table/dragHandleColumn';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { reorderByKey } from '../../utils/reorder';
import type { CreateLifecycleStageInput, DetectedValue, LifecycleObjectType, LifecycleStage } from '../../types/index';

function StageForm({
  initial,
  detected,
  onSubmit,
  onCancel,
}: {
  initial?: LifecycleStage;
  detected: DetectedValue[];
  onSubmit: (input: { externalName: string; internalName: string }) => void;
  onCancel?: () => void;
}) {
  const [externalName, setExternalName] = useState(initial?.externalName ?? '');
  const [internalName, setInternalName] = useState(initial?.internalName ?? '');

  const unmapped = detected.filter((d) => !d.mapped || d.internalName === initial?.internalName);

  const [handleSubmit, isSubmitting] = useSubmitGuard(async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({ externalName, internalName });
    if (!initial) {
      setExternalName('');
      setInternalName('');
    }
  });

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>Label</label>
        <input value={externalName} onChange={(e) => setExternalName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Internal ID (must exactly match the raw value already stored on your records)</label>
        <input value={internalName} onChange={(e) => setInternalName(e.target.value)} required />
        {unmapped.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {unmapped.map((d) => (
              <button
                type="button"
                key={d.internalName}
                className="line-item-tag"
                style={{ cursor: 'pointer' }}
                onClick={() => setInternalName(d.internalName)}
              >
                {d.internalName} ({d.count})
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="settings-form-footer">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting}>{initial ? 'Save' : 'Add'}</Button>
      </div>
    </form>
  );
}

export function LifecycleStagesManager({ objectType }: { objectType: LifecycleObjectType }) {
  const [stages, setStages] = useState<LifecycleStage[]>([]);
  const [detected, setDetected] = useState<DetectedValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingStage, setEditingStage] = useState<LifecycleStage | null>(null);
  const [deletingStage, setDeletingStage] = useState<LifecycleStage | null>(null);

  function load() {
    setIsLoading(true);
    Promise.all([lifecycleStagesApi.list(objectType), lifecycleStagesApi.getDetectedValues(objectType)])
      .then(([s, d]) => {
        setStages(s);
        setDetected(d);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [objectType]);

  async function handleAdd(input: { externalName: string; internalName: string }) {
    const payload: CreateLifecycleStageInput = { objectType, ...input };
    await lifecycleStagesApi.create(payload);
    setShowCreate(false);
    load();
  }

  async function handleUpdate(input: { externalName: string; internalName: string }) {
    if (!editingStage) return;
    await lifecycleStagesApi.update(editingStage.id, input);
    setEditingStage(null);
    load();
  }

  async function handleDelete() {
    if (!deletingStage) return;
    await lifecycleStagesApi.delete(deletingStage.id);
    setDeletingStage(null);
    load();
  }

  async function moveStage(draggedId: string, targetId: string) {
    const reordered = reorderByKey(stages, (s) => s.id, draggedId, targetId);
    if (reordered === stages) return;
    setStages(reordered);
    await lifecycleStagesApi.reorder(
      objectType,
      reordered.map((s) => s.id),
    );
  }

  function usageFor(stage: LifecycleStage) {
    return detected.find((d) => d.internalName === stage.internalName)?.count ?? 0;
  }

  const isContacts = objectType === 'contacts';

  // Contacts' lifecycle stage follows its company automatically — editing
  // (reordering, renaming, deleting) only makes sense on the Companies side,
  // so the drag handle and actions column are both omitted here rather than
  // rendered inert.
  const columns: Column<LifecycleStage>[] = [
    ...(isContacts ? [] : [dragHandleColumn<LifecycleStage>((s: LifecycleStage) => s.id)]),
    { key: 'externalName', header: 'Stage name', render: (s) => <span style={{ fontWeight: 600 }}>{s.externalName}</span> },
    { key: 'usedIn', header: 'Used in', render: (s) => usageFor(s).toLocaleString() },
    { key: 'internalName', header: 'Internal ID', render: (s) => s.internalName },
    ...(isContacts
      ? []
      : [
          {
            key: 'actions',
            header: 'Actions',
            render: (s: LifecycleStage) => (
              <RowActionsMenu
                actions={[
                  { label: 'Edit', icon: Pencil, onClick: () => setEditingStage(s) },
                  { label: 'Delete', icon: Trash2, onClick: () => setDeletingStage(s), variant: 'danger' as const },
                ]}
              />
            ),
          },
        ]),
  ];

  return (
    <div>
      {isContacts ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
          }}
        >
          <Info size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            A contact's lifecycle stage now follows its company automatically — new stages are added from{' '}
            <Link to="/settings/objects?object=companies" className="link">
              Company lifecycle
            </Link>
            {' '}instead.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <p style={{ color: 'var(--text-muted)', maxWidth: 560 }}>
            Track {objectType} as they move through your marketing and sales process. Give the raw lifecycle values
            already stored on your records friendly labels, and control their order.
          </p>
          <Button onClick={() => setShowCreate(true)}>+ Add Lifecycle</Button>
        </div>
      )}

      <Table
        columns={columns}
        data={stages}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="No lifecycle stages configured yet."
        onReorder={isContacts ? undefined : moveStage}
      />

      {showCreate && (
        <Modal title="Add Lifecycle Stage" onClose={() => setShowCreate(false)}>
          <StageForm detected={detected} onSubmit={handleAdd} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {editingStage && (
        <Modal title="Edit Stage" onClose={() => setEditingStage(null)}>
          <StageForm initial={editingStage} detected={detected} onSubmit={handleUpdate} onCancel={() => setEditingStage(null)} />
        </Modal>
      )}

      {deletingStage && (
        <ConfirmDialog
          title="Delete Lifecycle Stage?"
          message={`You are about to delete "${deletingStage.externalName}". This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingStage(null)}
        />
      )}
    </div>
  );
}

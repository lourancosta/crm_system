import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ListTree, Pencil, Trash2 } from 'lucide-react';
import { pipelinesApi } from '../../api/pipelines';
import { Button } from '../Button/Button';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { Modal } from '../Modal/Modal';
import { RowActionsMenu } from '../Dropdown/RowActionsMenu';
import { Table } from '../Table/Table';
import type { Column } from '../Table/Table';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { PipelineStagesModal } from './PipelineStagesModal';
import type { CreatePipelineInput, DetectedValue, PipelineObjectType, PipelineWithStages } from '../../types/index';

function PipelineForm({
  objectType,
  initial,
  onSubmit,
  onCancel,
}: {
  objectType: PipelineObjectType;
  initial?: PipelineWithStages;
  onSubmit: (input: CreatePipelineInput) => void;
  onCancel: () => void;
}) {
  const [externalName, setExternalName] = useState(initial?.externalName ?? '');
  const [internalName, setInternalName] = useState(initial?.internalName ?? '');
  const [detected, setDetected] = useState<DetectedValue[]>([]);

  useEffect(() => {
    pipelinesApi.getDetectedPipelineValues(objectType).then(setDetected);
  }, [objectType]);

  const [handleSubmit, isSubmitting] = useSubmitGuard(async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({ objectType, externalName, internalName });
  });

  const unmapped = detected.filter((d) => !d.mapped || d.internalName === initial?.internalName);

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>External name (shown to users)</label>
        <input value={externalName} onChange={(e) => setExternalName(e.target.value)} required autoFocus />
      </div>
      <div className="form-group">
        <label>Internal value (must exactly match the raw value already stored on your records)</label>
        <input value={internalName} onChange={(e) => setInternalName(e.target.value)} required />
        {unmapped.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Detected in your data:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
          </div>
        )}
      </div>
      <div className="settings-form-footer">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>Save</Button>
      </div>
    </form>
  );
}

export function PipelineManager({ objectType }: { objectType: PipelineObjectType }) {
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<PipelineWithStages | null>(null);
  const [managingPipeline, setManagingPipeline] = useState<PipelineWithStages | null>(null);
  const [deletingPipeline, setDeletingPipeline] = useState<PipelineWithStages | null>(null);

  function load() {
    setIsLoading(true);
    pipelinesApi
      .list(objectType)
      .then(setPipelines)
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [objectType]);

  async function handleCreate(input: CreatePipelineInput) {
    await pipelinesApi.create(input);
    setShowCreate(false);
    load();
  }

  async function handleUpdate(input: CreatePipelineInput) {
    if (!editingPipeline) return;
    await pipelinesApi.update(editingPipeline.id, { externalName: input.externalName, internalName: input.internalName });
    setEditingPipeline(null);
    load();
  }

  async function handleDelete() {
    if (!deletingPipeline) return;
    await pipelinesApi.delete(deletingPipeline.id);
    setDeletingPipeline(null);
    load();
  }

  const columns: Column<PipelineWithStages>[] = [
    { key: 'externalName', header: 'Name', render: (p) => <span style={{ fontWeight: 600 }}>{p.externalName}</span> },
    { key: 'internalName', header: 'Internal name', render: (p) => p.internalName },
    { key: 'stages', header: 'Stages', render: (p) => p.stages.length },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => (
        <RowActionsMenu
          actions={[
            { label: 'Manage stages', icon: ListTree, onClick: () => setManagingPipeline(p) },
            { label: 'Edit', icon: Pencil, onClick: () => setEditingPipeline(p) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeletingPipeline(p), variant: 'danger' },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <p style={{ color: 'var(--text-muted)', maxWidth: 560 }}>
          Give the raw pipeline/stage values already stored on your records friendly names to show across the app,
          and control the stage order used by the board view.
        </p>
        <Button onClick={() => setShowCreate(true)}>+ New Pipeline</Button>
      </div>

      <Table
        columns={columns}
        data={pipelines}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyMessage={`No pipelines configured for ${objectType}.`}
      />

      {showCreate && (
        <Modal title="New Pipeline" onClose={() => setShowCreate(false)}>
          <PipelineForm objectType={objectType} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {editingPipeline && (
        <Modal title="Edit Pipeline" onClose={() => setEditingPipeline(null)}>
          <PipelineForm
            objectType={objectType}
            initial={editingPipeline}
            onSubmit={handleUpdate}
            onCancel={() => setEditingPipeline(null)}
          />
        </Modal>
      )}

      {managingPipeline && (
        <PipelineStagesModal
          pipeline={managingPipeline}
          onClose={() => {
            setManagingPipeline(null);
            load();
          }}
        />
      )}

      {deletingPipeline && (
        <ConfirmDialog
          title="Delete Pipeline?"
          message={`You are about to delete "${deletingPipeline.externalName}". This also deletes its stages, and can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingPipeline(null)}
        />
      )}
    </div>
  );
}

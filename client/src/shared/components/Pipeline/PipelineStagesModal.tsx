import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { pipelinesApi } from '../../api/pipelines';
import { Button } from '../Button/Button';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { Modal } from '../Modal/Modal';
import { RowActionsMenu } from '../Dropdown/RowActionsMenu';
import { Table } from '../Table/Table';
import type { Column } from '../Table/Table';
import { dragHandleColumn } from '../Table/dragHandleColumn';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { reorderByKey } from '../../utils/reorder';
import type { CreateStageInput, DetectedValue, PipelineStage, PipelineWithStages } from '../../types/index';

function StageForm({
  initial,
  detected,
  onSubmit,
  onCancel,
}: {
  initial?: PipelineStage;
  detected: DetectedValue[];
  onSubmit: (input: CreateStageInput) => void;
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
        <label>External name</label>
        <input value={externalName} onChange={(e) => setExternalName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Internal value (must exactly match the raw value already stored on your records)</label>
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
        <Button type="submit" size={initial ? 'md' : 'sm'} isLoading={isSubmitting}>
          {initial ? 'Save' : 'Add stage'}
        </Button>
      </div>
    </form>
  );
}

export function PipelineStagesModal({ pipeline, onClose }: { pipeline: PipelineWithStages; onClose: () => void }) {
  const [stages, setStages] = useState<PipelineStage[]>(pipeline.stages);
  const [detected, setDetected] = useState<DetectedValue[]>([]);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [deletingStage, setDeletingStage] = useState<PipelineStage | null>(null);

  function load() {
    pipelinesApi.getById(pipeline.id).then((p) => setStages(p.stages));
    pipelinesApi.getDetectedStageValues(pipeline.id).then(setDetected);
  }

  useEffect(load, [pipeline.id]);

  async function handleAdd(input: CreateStageInput) {
    await pipelinesApi.createStage(pipeline.id, input);
    load();
  }

  async function handleUpdate(input: CreateStageInput) {
    if (!editingStage) return;
    await pipelinesApi.updateStage(pipeline.id, editingStage.id, input);
    setEditingStage(null);
    load();
  }

  async function handleDelete() {
    if (!deletingStage) return;
    await pipelinesApi.deleteStage(pipeline.id, deletingStage.id);
    setDeletingStage(null);
    load();
  }

  async function moveStage(draggedId: string, targetId: string) {
    const reordered = reorderByKey(stages, (s) => s.id, draggedId, targetId);
    if (reordered === stages) return;
    setStages(reordered);
    await pipelinesApi.reorderStages(
      pipeline.id,
      reordered.map((s) => s.id),
    );
  }

  const columns: Column<PipelineStage>[] = [
    dragHandleColumn<PipelineStage>((s) => s.id),
    { key: 'externalName', header: 'Name', render: (s) => <span style={{ fontWeight: 600 }}>{s.externalName}</span> },
    { key: 'internalName', header: 'Internal name', render: (s) => s.internalName },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <RowActionsMenu
          actions={[
            { label: 'Edit', icon: Pencil, onClick: () => setEditingStage(s) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeletingStage(s), variant: 'danger' },
          ]}
        />
      ),
    },
  ];

  return (
    <Modal title={`Stages — ${pipeline.externalName}`} onClose={onClose}>
      <div className="tab-panel-section" style={{ padding: 0, marginBottom: 20 }}>
        <StageForm detected={detected} onSubmit={handleAdd} />
      </div>

      <Table columns={columns} data={stages} keyExtractor={(s) => s.id} emptyMessage="No stages yet." onReorder={moveStage} />

      {editingStage && (
        <Modal title="Edit Stage" onClose={() => setEditingStage(null)}>
          <StageForm initial={editingStage} detected={detected} onSubmit={handleUpdate} onCancel={() => setEditingStage(null)} />
        </Modal>
      )}

      {deletingStage && (
        <ConfirmDialog
          title="Delete Stage?"
          message={`You are about to delete "${deletingStage.externalName}". This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingStage(null)}
        />
      )}
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { knowledgeBaseApi } from './api/knowledgeBase';
import { Button } from '../../shared/components/Button/Button';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { Modal } from '../../shared/components/Modal/Modal';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import { Table } from '../../shared/components/Table/Table';
import { dragHandleColumn } from '../../shared/components/Table/dragHandleColumn';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { reorderByKey } from '../../shared/utils/reorder';
import type { Column } from '../../shared/components/Table/Table';
import type { CreateKbSubcategoryInput, KbCategoryWithSubcategories, KbSubcategory } from '../../shared/types/index';

function SubcategoryForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: KbSubcategory;
  onSubmit: (input: CreateKbSubcategoryInput) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [titlePt, setTitlePt] = useState(initial?.translations?.pt ?? '');
  const [titleEs, setTitleEs] = useState(initial?.translations?.es ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');

  const [handleSubmit, isSubmitting] = useSubmitGuard(async (e: FormEvent) => {
    e.preventDefault();
    const translations: Record<string, string> = {};
    if (titlePt.trim()) translations.pt = titlePt.trim();
    if (titleEs.trim()) translations.es = titleEs.trim();
    await onSubmit({ title, slug, translations: Object.keys(translations).length > 0 ? translations : undefined });
    if (!initial) {
      setTitle('');
      setTitlePt('');
      setTitleEs('');
      setSlug('');
    }
  });

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>Title (English)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Title (Portuguese)</label>
          <input value={titlePt} onChange={(e) => setTitlePt(e.target.value)} placeholder="Falls back to English" />
        </div>
        <div className="form-group">
          <label>Title (Spanish)</label>
          <input value={titleEs} onChange={(e) => setTitleEs(e.target.value)} placeholder="Falls back to English" />
        </div>
      </div>
      <div className="form-group">
        <label>Slug</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
      </div>
      <div className="settings-form-footer">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size={initial ? 'md' : 'sm'} isLoading={isSubmitting}>
          {initial ? 'Save' : 'Add subcategory'}
        </Button>
      </div>
    </form>
  );
}

export function SubcategoriesModal({
  category,
  onClose,
}: {
  category: KbCategoryWithSubcategories;
  onClose: () => void;
}) {
  const [subcategories, setSubcategories] = useState<KbSubcategory[]>(category.subcategories);
  const [editingSubcategory, setEditingSubcategory] = useState<KbSubcategory | null>(null);
  const [deletingSubcategory, setDeletingSubcategory] = useState<KbSubcategory | null>(null);

  function load() {
    knowledgeBaseApi.getCategory(category.id).then((c) => setSubcategories(c.subcategories));
  }

  useEffect(load, [category.id]);

  async function handleAdd(input: CreateKbSubcategoryInput) {
    await knowledgeBaseApi.createSubcategory(category.id, input);
    load();
  }

  async function handleUpdate(input: CreateKbSubcategoryInput) {
    if (!editingSubcategory) return;
    await knowledgeBaseApi.updateSubcategory(category.id, editingSubcategory.id, input);
    setEditingSubcategory(null);
    load();
  }

  async function handleDelete() {
    if (!deletingSubcategory) return;
    await knowledgeBaseApi.deleteSubcategory(category.id, deletingSubcategory.id);
    setDeletingSubcategory(null);
    load();
  }

  async function moveSubcategory(draggedId: string, targetId: string) {
    const reordered = reorderByKey(subcategories, (s) => s.id, draggedId, targetId);
    if (reordered === subcategories) return;
    setSubcategories(reordered);
    await knowledgeBaseApi.reorderSubcategories(category.id, reordered.map((s) => s.id));
  }

  const columns: Column<KbSubcategory>[] = [
    dragHandleColumn<KbSubcategory>((s) => s.id),
    { key: 'title', header: 'Title', render: (s) => <span style={{ fontWeight: 600 }}>{s.title}</span> },
    { key: 'slug', header: 'Slug', render: (s) => s.slug },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <RowActionsMenu
          actions={[
            { label: 'Edit', icon: Pencil, onClick: () => setEditingSubcategory(s) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeletingSubcategory(s), variant: 'danger' },
          ]}
        />
      ),
    },
  ];

  return (
    <Modal title={`Subcategories — ${category.title}`} onClose={onClose}>
      <div className="tab-panel-section" style={{ padding: 0, marginBottom: 20 }}>
        <SubcategoryForm onSubmit={handleAdd} />
      </div>

      <Table columns={columns} data={subcategories} keyExtractor={(s) => s.id} emptyMessage="No subcategories yet." onReorder={moveSubcategory} />

      {editingSubcategory && (
        <Modal title="Edit Subcategory" onClose={() => setEditingSubcategory(null)}>
          <SubcategoryForm initial={editingSubcategory} onSubmit={handleUpdate} onCancel={() => setEditingSubcategory(null)} />
        </Modal>
      )}

      {deletingSubcategory && (
        <ConfirmDialog
          title="Delete Subcategory?"
          message={`You are about to delete "${deletingSubcategory.title}". This also deletes its articles, and can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingSubcategory(null)}
        />
      )}
    </Modal>
  );
}

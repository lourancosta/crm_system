import { useEffect, useState } from 'react';
import { ListTree, Pencil, Trash2 } from 'lucide-react';
import { knowledgeBaseApi } from './api/knowledgeBase';
import { Button } from '../../shared/components/Button/Button';
import { CategoryForm } from './CategoryForm';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { Modal } from '../../shared/components/Modal/Modal';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import { SubcategoriesModal } from './SubcategoriesModal';
import { Table } from '../../shared/components/Table/Table';
import type { Column } from '../../shared/components/Table/Table';
import type { CreateKbCategoryInput, KbCategoryWithSubcategories } from '../../shared/types/index';

export function KbCategoriesPage() {
  const [categories, setCategories] = useState<KbCategoryWithSubcategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KbCategoryWithSubcategories | null>(null);
  const [managingCategory, setManagingCategory] = useState<KbCategoryWithSubcategories | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<KbCategoryWithSubcategories | null>(null);

  function load() {
    setIsLoading(true);
    knowledgeBaseApi
      .listCategories()
      .then(setCategories)
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(input: CreateKbCategoryInput) {
    await knowledgeBaseApi.createCategory(input);
    setShowCreate(false);
    load();
  }

  async function handleUpdate(input: CreateKbCategoryInput) {
    if (!editingCategory) return;
    await knowledgeBaseApi.updateCategory(editingCategory.id, input);
    setEditingCategory(null);
    load();
  }

  async function handleDelete() {
    if (!deletingCategory) return;
    await knowledgeBaseApi.deleteCategory(deletingCategory.id);
    setDeletingCategory(null);
    load();
  }

  const columns: Column<KbCategoryWithSubcategories>[] = [
    {
      key: 'title',
      header: 'Category',
      render: (c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {c.imageUrl && (
            <img src={c.imageUrl} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.slug}</div>
          </div>
        </div>
      ),
    },
    { key: 'subcategories', header: 'Subcategories', render: (c) => c.subcategories.length },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <RowActionsMenu
          actions={[
            { label: 'Manage subcategories', icon: ListTree, onClick: () => setManagingCategory(c) },
            { label: 'Edit', icon: Pencil, onClick: () => setEditingCategory(c) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeletingCategory(c), variant: 'danger' },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <p style={{ color: 'var(--text-muted)', maxWidth: 560 }}>
          Categories are the top-level squares shown on the knowledge base home page.
        </p>
        <Button onClick={() => setShowCreate(true)}>+ New Category</Button>
      </div>

      <Table
        columns={columns}
        data={categories}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No categories yet."
      />

      {showCreate && (
        <Modal title="New Category" onClose={() => setShowCreate(false)}>
          <CategoryForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {editingCategory && (
        <Modal title="Edit Category" onClose={() => setEditingCategory(null)}>
          <CategoryForm initial={editingCategory} onSubmit={handleUpdate} onCancel={() => setEditingCategory(null)} />
        </Modal>
      )}

      {managingCategory && (
        <SubcategoriesModal
          category={managingCategory}
          onClose={() => {
            setManagingCategory(null);
            load();
          }}
        />
      )}

      {deletingCategory && (
        <ConfirmDialog
          title="Delete Category?"
          message={`You are about to delete "${deletingCategory.title}". This also deletes its subcategories and articles, and can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingCategory(null)}
        />
      )}
    </div>
  );
}

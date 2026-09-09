import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { emailTemplatesApi } from './api/emailTemplates';
import { Button } from '../../shared/components/Button/Button';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import { Table } from '../../shared/components/Table/Table';
import type { Column } from '../../shared/components/Table/Table';
import type { EmailTemplate } from '../../shared/types/index';

const PAGE_SIZE = 50;

export function EmailTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    setIsLoading(true);
    emailTemplatesApi
      .list({ page, limit: PAGE_SIZE, search: debouncedSearch })
      .then((r) => { setTemplates(r.data); setTotal(r.total); })
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, debouncedSearch]);

  async function handleDelete() {
    if (!deletingTemplate) return;
    await emailTemplatesApi.delete(deletingTemplate.id);
    setDeletingTemplate(null);
    load();
  }

  const columns: Column<EmailTemplate>[] = [
    { key: 'name', header: 'Name', render: (t) => <span style={{ fontWeight: 600 }}>{t.name}</span> },
    { key: 'subject', header: 'Subject', render: (t) => t.subject },
    {
      key: 'objects',
      header: 'Applies to',
      render: (t) => (t.objects.length === 0 ? '—' : t.objects.map((o) => o.charAt(0).toUpperCase() + o.slice(1)).join(', ')),
    },
    { key: 'updatedAt', header: 'Updated', render: (t) => new Date(t.updatedAt).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (
        <RowActionsMenu
          actions={[
            { label: 'Edit', icon: Pencil, onClick: () => navigate(`/marketing/emails/${t.id}`) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeletingTemplate(t), variant: 'danger' },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Emails" />
        <Button onClick={() => navigate('/marketing/emails/new')}>+ New Template</Button>
      </div>

      <p style={{ color: 'var(--text-muted)', marginTop: -8, marginBottom: 16 }}>
        Reusable HTML email templates. CRM features (invoice reminders, quotes, ...) can send using one of these
        instead of their own one-off content.
      </p>

      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        data={templates}
        keyExtractor={(t) => t.id}
        isLoading={isLoading}
        emptyMessage="No email templates yet."
        onRowClick={(t) => navigate(`/marketing/emails/${t.id}`)}
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />

      {deletingTemplate && (
        <ConfirmDialog
          title="Delete Email Template?"
          message={`You are about to delete "${deletingTemplate.name}". This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTemplate(null)}
        />
      )}
    </div>
  );
}

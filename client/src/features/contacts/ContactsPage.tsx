import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { contactsApi } from './api/contacts';
import { TruncatedText } from '../../shared/components/TruncatedText/TruncatedText';
import { Button } from '../../shared/components/Button/Button';
import { CreateContactPanel } from './CreateContactPanel';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { Table } from '../../shared/components/Table/Table';
import type { Column } from '../../shared/components/Table/Table';
import type { Contact } from '../../shared/types/index';

const PAGE_SIZE = 50;

export function ContactsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setIsLoading(true);
    contactsApi
      .list(page, PAGE_SIZE, debouncedSearch)
      .then((result) => { setContacts(result.data); setTotal(result.total); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load contacts'))
      .finally(() => setIsLoading(false));
  }, [page, debouncedSearch]);

  function handleCreated(id: string) {
    setIsCreateOpen(false);
    navigate(`/contacts/${id}`, { state: { backgroundLocation: location } });
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (c) => (
        <RecordLink to={`/contacts/${c.id}`} className="link">
          <TruncatedText text={[c.firstname, c.lastname].filter(Boolean).join(' ') || null} />
        </RecordLink>
      ),
    },
    { key: 'email', header: 'Email', render: (c) => c.email ?? '—' },
    { key: 'phone', header: 'Phone', render: (c) => c.phone ?? '—' },
    { key: 'company', header: 'Company', render: (c) => c.company ?? '—' },
    { key: 'createdate', header: 'Created date', render: (c) => formatDate(c.createdate) },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Contacts" />
        <Button variant="accent" onClick={() => setIsCreateOpen(true)}>+ Add contact</Button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Table
        columns={columns}
        data={contacts}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No contacts yet. Add your first one!"
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />
      {isCreateOpen && <CreateContactPanel onCreated={handleCreated} onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
}

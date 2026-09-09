import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { companiesApi } from './api/companies';
import { TruncatedText } from '../../shared/components/TruncatedText/TruncatedText';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { Table } from '../../shared/components/Table/Table';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { CreateCompanyPanel } from './CreateCompanyPanel';
import { Button } from '../../shared/components/Button/Button';
import type { Column } from '../../shared/components/Table/Table';
import type { Company } from '../../shared/types/index';

const PAGE_SIZE = 50;

function formatIndustry(val: string | null) {
  if (!val) return '—';
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const columns: Column<Company>[] = [
  { key: 'name', header: 'Name', render: (c) => <RecordLink to={`/companies/${c.id}`} className="link"><TruncatedText text={c.name} /></RecordLink> },
  { key: 'lifecyclestage', header: 'Lifecycle', render: (c) => c.lifecyclestage ?? '—' },
  { key: 'industry', header: 'Industry', render: (c) => formatIndustry(c.industry) },
  { key: 'domain', header: 'Domain', render: (c) => c.domain ?? '—' },
  { key: 'createdate', header: 'Created date', render: (c) => formatDate(c.createdate) },
];

export function CompaniesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setIsLoading(true);
    companiesApi
      .list(page, PAGE_SIZE, debouncedSearch)
      .then((r) => { setCompanies(r.data); setTotal(r.total); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }, [page, debouncedSearch]);

  function handleCreated(id: string) {
    setShowForm(false);
    navigate(`/companies/${id}`, { state: { backgroundLocation: location } });
  }

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Companies" />
        <Button variant="accent" onClick={() => setShowForm(true)}>+ Add company</Button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by name or domain…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Table
        columns={columns}
        data={companies}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No companies found."
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />
      {showForm && <CreateCompanyPanel onCreated={handleCreated} onClose={() => setShowForm(false)} />}
    </div>
  );
}

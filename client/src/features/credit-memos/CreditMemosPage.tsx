import { useEffect, useState } from 'react';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { creditMemosApi } from './api/creditMemos';
import { Button } from '../../shared/components/Button/Button';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { Select } from '../../shared/components/Dropdown/Select';
import { CreateCreditMemoPanel } from './CreateCreditMemoPanel';
import { Table } from '../../shared/components/Table/Table';
import type { Column, TablePagination } from '../../shared/components/Table/Table';
import { CREDIT_MEMO_STATUS_CONFIG, CreditMemoStatusBadge } from '../../shared/components/StatusBadge/CreditMemoStatusBadge';
import type { CreditMemo } from '../../shared/types/index';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...(['unapplied', 'partially_applied', 'applied', 'voided'] as const).map((value) => ({
    value,
    label: CREDIT_MEMO_STATUS_CONFIG[value].label,
    color: CREDIT_MEMO_STATUS_CONFIG[value].color,
  })),
];

function formatCurrency(amount: string | null, currency: string | null) {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD' }).format(parseFloat(amount));
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const PAGE_SIZE = 50;

const columns: Column<CreditMemo>[] = [
  { key: 'number', header: 'Number', render: (cm) => <RecordLink to={`/credit-memos/${cm.id}`} className="link">{cm.hsNumber ?? '—'}</RecordLink> },
  {
    key: 'company',
    header: 'Company',
    render: (cm) =>
      cm.companyId ? (
        <RecordLink to={`/companies/${cm.companyId}`} className="link">{cm.companyName ?? '—'}</RecordLink>
      ) : (
        '—'
      ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (cm) => (
      <CreditMemoStatusBadge hsCreditMemoStatus={cm.hsCreditMemoStatus} appliedAmount={cm.appliedAmount} openAmount={cm.openAmount} />
    ),
  },
  { key: 'amount', header: 'Amount', render: (cm) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(cm.hsAmountCredited, cm.hsCurrency)}</span> },
  { key: 'openAmount', header: 'Open Amount', render: (cm) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(cm.openAmount, cm.hsCurrency)}</span> },
  { key: 'appliedAmount', header: 'Applied Amount', render: (cm) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(cm.appliedAmount, cm.hsCurrency)}</span> },
  { key: 'date', header: 'Date', render: (cm) => formatDate(cm.hsCreditMemoDate) },
];

export function CreditMemosPage() {
  const [creditMemos, setCreditMemos] = useState<CreditMemo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    setIsLoading(true);
    creditMemosApi
      .list(page, PAGE_SIZE, debouncedSearch, status)
      .then((r) => { setCreditMemos(r.data); setTotal(r.total); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, debouncedSearch, status]);

  function handleStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  function handleIssue() {
    setShowForm(false);
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Credit Memos" />
        <Button variant="accent" onClick={() => setShowForm(true)}>+ Issue Credit Memo</Button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onChange={handleStatusChange} options={STATUS_OPTIONS} ariaLabel="Status" />
      </div>
      <Table
        columns={columns}
        data={creditMemos}
        keyExtractor={(cm) => cm.id}
        isLoading={isLoading}
        emptyMessage="No credit memos found."
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage } as TablePagination}
      />

      {showForm && <CreateCreditMemoPanel onCreated={handleIssue} onClose={() => setShowForm(false)} />}
    </div>
  );
}

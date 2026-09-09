import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { quotesApi } from './api/quotes';
import { Button } from '../../shared/components/Button/Button';
import { CreateQuoteWizard } from './wizard/CreateQuoteWizard';
import { QuoteReminderBanner } from '../../shared/components/SetupBanner/QuoteReminderBanner';
import { QuoteCountersignerBanner } from '../../shared/components/SetupBanner/QuoteCountersignerBanner';
import { Select } from '../../shared/components/Dropdown/Select';
import { Table } from '../../shared/components/Table/Table';
import type { Column } from '../../shared/components/Table/Table';
import { formatCurrency } from '../../shared/utils/currency';
import type { Quote } from '../../shared/types/index';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: '#9ca3af' },
  PUBLISHED: { label: 'Published', color: '#16a34a' },
  AWAITING_COUNTERSIGNATURE: { label: 'Awaiting countersignature', color: '#eab308' },
  SIGNED: { label: 'Signed', color: '#16a34a' },
  EXPIRED: { label: 'Expired', color: '#dc2626' },
  ARCHIVED: { label: 'Archived', color: '#9ca3af' },
};

// isSigned overrides the raw status display — hsQuoteStatus stays a
// faithful mirror of HubSpot's own DRAFT/PUBLISHED/EXPIRED/ARCHIVED value
// (a quote can be simultaneously EXPIRED there and signed), but a signed
// quote should always read as "Signed" here regardless of that raw value.
function StatusBadge({ status, isSigned }: { status: string | null; isSigned?: boolean }) {
  const effectiveStatus = isSigned ? 'SIGNED' : status;
  if (!effectiveStatus) return <span className="status-badge"><span className="status-dot" style={{ background: '#9ca3af' }} />—</span>;
  const config = STATUS_CONFIG[effectiveStatus] ?? { label: effectiveStatus, color: '#9ca3af' };
  return (
    <span className="status-badge">
      <span className="status-dot" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}

const SIGNED_PILL_STYLE: CSSProperties = {
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 999,
  background: '#16a34a',
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const PAGE_SIZE = 50;

const columns: Column<Quote>[] = [
  { key: 'title', header: 'Title', render: (q) => <RecordLink to={`/quotes/${q.id}`} className="link">{q.hsTitle ?? q.hsDealName ?? 'Untitled quote'}</RecordLink> },
  {
    key: 'company',
    header: 'Company Buyer',
    render: (q) => (q.companyId ? <RecordLink to={`/companies/${q.companyId}`} className="link">{q.companyName ?? '—'}</RecordLink> : '—'),
  },
  { key: 'status', header: 'Status', render: (q) => <StatusBadge status={q.hsQuoteStatus} isSigned={q.isSigned} /> },
  {
    key: 'signedDate',
    header: 'Signed',
    render: (q) =>
      q.isSigned ? (
        <span style={SIGNED_PILL_STYLE}>Signed{q.hsSignedDate ? ` · ${formatDate(q.hsSignedDate)}` : ''}</span>
      ) : (
        '—'
      ),
  },
  { key: 'amount', header: 'Amount', render: (q) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(q.hsQuoteAmount, q.hsCurrency)}</span> },
  { key: 'tcv', header: 'TCV', render: (q) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(q.hsTcv, q.hsCurrency)}</span> },
  { key: 'owner', header: 'Owner', render: (q) => q.ownerName ?? '—' },
  { key: 'createdAt', header: 'Created date', render: (q) => formatDate(q.createdAt) },
  { key: 'expirationDate', header: 'Expiration date', render: (q) => formatDate(q.hsExpirationDate) },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label, color: config.color })),
];

export function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setIsLoading(true);
    quotesApi
      .list(page, PAGE_SIZE, debouncedSearch, status)
      .then((r) => { setQuotes(r.data); setTotal(r.total); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }, [page, debouncedSearch, status, refreshKey]);

  function handleStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Quotes" />
        <Button variant="accent" onClick={() => setShowCreate(true)}>+ Create Quote</Button>
      </div>
      <QuoteReminderBanner />
      <QuoteCountersignerBanner />
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onChange={handleStatusChange} options={STATUS_OPTIONS} ariaLabel="Status" />
      </div>
      <Table
        columns={columns}
        data={quotes}
        keyExtractor={(q) => q.id}
        isLoading={isLoading}
        emptyMessage="No quotes found."
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />

      {showCreate && (
        <CreateQuoteWizard
          onClose={() => {
            setShowCreate(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

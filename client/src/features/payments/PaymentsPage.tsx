import { useEffect, useState } from 'react';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { paymentsApi } from './api/payments';
import { Button } from '../../shared/components/Button/Button';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { CreatePaymentPanel } from './CreatePaymentPanel';
import { Table } from '../../shared/components/Table/Table';
import type { Column, TablePagination } from '../../shared/components/Table/Table';
import type { Payment } from '../../shared/types/index';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  succeeded: { label: 'Succeeded', color: '#16a34a' },
  failed: { label: 'Failed', color: '#dc2626' },
  refunded: { label: 'Refunded', color: '#9ca3af' },
  pending: { label: 'Pending', color: '#eab308' },
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="status-badge"><span className="status-dot" style={{ background: '#9ca3af' }} />—</span>;
  const config = STATUS_CONFIG[status.toLowerCase()] ?? { label: status, color: '#9ca3af' };
  return (
    <span className="status-badge">
      <span className="status-dot" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}

function formatCurrency(amount: string | null, currency: string | null) {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD' }).format(parseFloat(amount));
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMethod(val: string | null) {
  if (!val) return '—';
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAGE_SIZE = 50;

const columns: Column<Payment>[] = [
  { key: 'paymentId', header: 'Payment ID', render: (p) => <RecordLink to={`/payments/${p.id}`} className="link">{p.hsPaymentId ?? '—'}</RecordLink> },
  { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.hsLatestStatus} /> },
  { key: 'company', header: 'Company', render: (p) => p.companyName ?? '—' },
  { key: 'grossAmount', header: 'Gross amount', render: (p) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.hsInitialAmount, p.hsCurrencyCode)}</span> },
  { key: 'paymentDate', header: 'Payment date', render: (p) => formatDate(p.hsInitiatedDate) },
  { key: 'paymentMethod', header: 'Payment method', render: (p) => formatMethod(p.hsPaymentMethodType) },
];

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    setIsLoading(true);
    paymentsApi
      .list(page, PAGE_SIZE, debouncedSearch)
      .then((r) => { setPayments(r.data); setTotal(r.total); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, debouncedSearch]);

  function handleRegisterPayment() {
    setShowPaymentForm(false);
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Payments" />
        <Button variant="accent" onClick={() => setShowPaymentForm(true)}>+ Register Payment</Button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by payment ID, customer email or reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Table
        columns={columns}
        data={payments}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyMessage="No payments found."
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage } as TablePagination}
      />

      {showPaymentForm && <CreatePaymentPanel onCreated={handleRegisterPayment} onClose={() => setShowPaymentForm(false)} />}
    </div>
  );
}

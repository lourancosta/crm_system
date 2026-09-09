import { useEffect, useState } from 'react';
import { licensesApi } from './api/licenses';
import { Button } from '../../shared/components/Button/Button';
import { LicenseForm } from './LicenseForm';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { Select } from '../../shared/components/Dropdown/Select';
import { Table } from '../../shared/components/Table/Table';
import type { Column } from '../../shared/components/Table/Table';
import type { License } from '../../shared/types/index';
import { formatQuantity } from '../../shared/utils/numberInput';

const PAGE_SIZE = 50;

const LICENSE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:  { label: 'Active',  color: '#16a34a' },
  expired: { label: 'Expired', color: '#dc2626' },
  revoked: { label: 'Revoked', color: '#9ca3af' },
};

function LicenseStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span>—</span>;
  const config = LICENSE_STATUS_CONFIG[status.toLowerCase()] ?? { label: status, color: '#9ca3af' };
  return (
    <span className="status-badge">
      <span className="status-dot" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const columns: Column<License>[] = [
  { key: 'name', header: 'Name', render: (l) => <RecordLink to={`/licenses/${l.id}`} className="link">{l.name ?? '—'}</RecordLink> },
  { key: 'status', header: 'Status', render: (l) => <LicenseStatusBadge status={l.status} /> },
  { key: 'customerName', header: 'Customer', render: (l) => l.customerName ?? '—' },
  { key: 'partnerName', header: 'Partner', render: (l) => l.partnerName ?? '—' },
  { key: 'typeObj', header: 'Type', render: (l) => l.typeObj ?? '—' },
  { key: 'subscription', header: 'Subscription', render: (l) => l.subscription?.toUpperCase() ?? '—' },
  { key: 'quantity', header: 'Modules', render: (l) => formatQuantity(l.quantity) },
  { key: 'platformCreatedDate', header: 'Platform created', render: (l) => formatDate(l.platformCreatedDate) },
  { key: 'activationDate', header: 'Activation', render: (l) => formatDate(l.activationDate) },
  { key: 'expirationDate', header: 'Expiration', render: (l) => formatDate(l.expirationDate) },
];

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Expired', value: 'expired' },
  { label: 'Revoked', value: 'revoked' },
];

const SUBSCRIPTION_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'MSP', value: 'msp' },
  { label: 'Reseller', value: 'reseller' },
];

export function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [subscription, setSubscription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    setIsLoading(true);
    licensesApi
      .list(page, PAGE_SIZE, debouncedSearch, status, subscription)
      .then((r) => { setLicenses(r.data); setTotal(r.total); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, debouncedSearch, status, subscription]);

  function handleStatusChange(val: string) { setPage(1); setStatus(val); }
  function handleSubscriptionChange(val: string) { setPage(1); setSubscription(val); }

  function handleCreated() {
    setShowForm(false);
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Licenses" />
        <Button variant="accent" onClick={() => setShowForm(true)}>+ Add license</Button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by customer or partner…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onChange={handleStatusChange} options={STATUS_OPTIONS} ariaLabel="Status" />
        <Select
          value={subscription}
          onChange={handleSubscriptionChange}
          options={SUBSCRIPTION_OPTIONS}
          ariaLabel="Subscription"
        />
      </div>
      <Table
        columns={columns}
        data={licenses}
        keyExtractor={(l) => l.id}
        isLoading={isLoading}
        emptyMessage="No licenses found."
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />

      {showForm && <LicenseForm onCreated={handleCreated} onClose={() => setShowForm(false)} />}
    </div>
  );
}

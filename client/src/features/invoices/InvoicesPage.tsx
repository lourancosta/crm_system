import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { invoicesApi } from './api/invoices';
import { Button } from '../../shared/components/Button/Button';
import { Modal } from '../../shared/components/Modal/Modal';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { Select } from '../../shared/components/Dropdown/Select';
import { TruncatedText } from '../../shared/components/TruncatedText/TruncatedText';
import { Table } from '../../shared/components/Table/Table';
import type { Column } from '../../shared/components/Table/Table';
import { CreateInvoiceForm, CREATE_INVOICE_FORM_ID } from './CreateInvoiceForm';
import { InvoiceRemindersBanner } from '../../shared/components/SetupBanner/InvoiceRemindersBanner';
import type { Invoice } from '../../shared/types/index';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:   { label: 'Open',   color: '#eab308' },
  paid:   { label: 'Paid',   color: '#16a34a' },
  voided: { label: 'Voided', color: '#dc2626' },
  draft:  { label: 'Draft',  color: '#9ca3af' },
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

function capitalize(val: string | null) {
  if (!val) return '—';
  return val.charAt(0).toUpperCase() + val.slice(1);
}

function formatInstallment(inv: Invoice) {
  if (inv.typeObj !== 'reseller' || !inv.installmentNumber || !inv.installmentTotal) return '—';
  return `${inv.installmentNumber} / ${inv.installmentTotal}`;
}

const PAGE_SIZE = 50;

const columns: Column<Invoice>[] = [
  { key: 'number', header: 'Number', render: (inv) => <RecordLink to={`/invoices/${inv.id}`} className="link">{inv.hsNumber ?? '—'}</RecordLink> },
  { key: 'status', header: 'Status', render: (inv) => <StatusBadge status={inv.hsInvoiceStatus} /> },
  { key: 'tenant', header: 'Tenant', render: (inv) => <TruncatedText text={inv.tenant?.trim()} /> },
  { key: 'company', header: 'Company', render: (inv) => <TruncatedText text={inv.hsInvoiceLatestCompanyName} /> },
  { key: 'dueDate', header: 'Due date', render: (inv) => formatDate(inv.hsDueDate) },
  { key: 'amountBilled', header: 'Billed amount', render: (inv) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(inv.hsAmountBilled, inv.hsCurrency)}</span> },
  { key: 'amountPaid', header: 'Amount paid', render: (inv) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(inv.hsAmountPaid, inv.hsCurrency)}</span> },
  { key: 'type', header: 'Type', render: (inv) => capitalize(inv.typeObj) },
  { key: 'installment', header: 'Installment', render: (inv) => formatInstallment(inv) },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label, color: config.color })),
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'reseller', label: 'Reseller' },
  { value: 'msp', label: 'MSP' },
];

export function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateDirty, setIsCreateDirty] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setIsLoading(true);
    invoicesApi
      .list(page, PAGE_SIZE, debouncedSearch, status, type)
      .then((r) => { setInvoices(r.data); setTotal(r.total); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }, [page, debouncedSearch, status, type]);

  function handleStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  function handleTypeChange(value: string) {
    setType(value);
    setPage(1);
  }

  function refreshList() {
    invoicesApi
      .list(page, PAGE_SIZE, debouncedSearch, status, type)
      .then((r) => { setInvoices(r.data); setTotal(r.total); });
  }

  function closeCreateModal() {
    setShowCreate(false);
    setIsExitConfirmOpen(false);
    setIsCreateDirty(false);
    refreshList(); // picks up any draft that was Saved this session
  }

  function handleExitCreateAttempt() {
    if (isCreateDirty) setIsExitConfirmOpen(true);
    else closeCreateModal();
  }

  function handleInvoicePublished(invoice: Invoice) {
    setShowCreate(false);
    navigate(`/invoices/${invoice.id}`);
  }

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Invoices" />
        <Button variant="accent" onClick={() => setShowCreate(true)}>+ New Invoice</Button>
      </div>
      <InvoiceRemindersBanner />
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by number, tenant or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onChange={handleStatusChange} options={STATUS_OPTIONS} ariaLabel="Status" />
        <Select value={type} onChange={handleTypeChange} options={TYPE_OPTIONS} ariaLabel="Type" />
      </div>
      <Table
        columns={columns}
        data={invoices}
        keyExtractor={(inv) => inv.id}
        isLoading={isLoading}
        emptyMessage="No invoices found."
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />

      {showCreate && (
        <Modal
          title="New Invoice"
          onClose={handleExitCreateAttempt}
          variant="fullscreen"
          headerActions={
            <div style={{ display: 'flex', gap: 12 }}>
              <Button variant="secondary" type="button" onClick={handleExitCreateAttempt}>
                Exit
              </Button>
              <Button type="submit" form={CREATE_INVOICE_FORM_ID} value="save" isLoading={isSubmitting} variant="secondary">
                Save
              </Button>
              <Button type="submit" form={CREATE_INVOICE_FORM_ID} value="publish" isLoading={isSubmitting} variant="accent">
                Create
              </Button>
            </div>
          }
        >
          <CreateInvoiceForm
            onDraftSaved={refreshList}
            onPublished={handleInvoicePublished}
            onDirtyChange={setIsCreateDirty}
            onSubmittingChange={setIsSubmitting}
          />
        </Modal>
      )}

      {isExitConfirmOpen && (
        <ConfirmDialog
          title="Exit without saving?"
          message="You have unsaved changes on this invoice. If you exit now, they'll be lost."
          confirmLabel="Exit without saving"
          cancelLabel="Go back"
          onConfirm={closeCreateModal}
          onCancel={() => setIsExitConfirmOpen(false)}
        />
      )}
    </div>
  );
}

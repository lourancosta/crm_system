// Same dot-plus-label pattern as the Invoices list table
// (InvoicesPage.tsx's StatusBadge + STATUS_CONFIG) — kept as a shared
// component so association-panel cards elsewhere (Deal's/Company's Invoices
// panels, etc.) render status identically to the list view.
const INVOICE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: '#eab308' },
  paid: { label: 'Paid', color: '#16a34a' },
  voided: { label: 'Voided', color: '#dc2626' },
  draft: { label: 'Draft', color: '#9ca3af' },
};

export function InvoiceStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const config = INVOICE_STATUS_CONFIG[status.toLowerCase()] ?? { label: status, color: '#9ca3af' };
  return (
    <span className="status-badge">
      <span className="status-dot" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}

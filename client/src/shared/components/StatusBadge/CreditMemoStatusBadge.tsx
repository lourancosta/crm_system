// Same dot-plus-label pattern as InvoiceStatusBadge/LicenseStatusBadge, but
// the label is derived rather than a raw stored value — 'issued' (the only
// status this app has ever actually set on create) fans out into Unapplied/
// Partially Applied/Applied based on how much of the memo has been applied
// to invoices so far (appliedAmount/openAmount, both already computed
// server-side from credit_memo_applications). Draft/Voided pass through as
// their own literal hsCreditMemoStatus values.
export type CreditMemoStatusInput = {
  hsCreditMemoStatus: string | null;
  appliedAmount: string | number | null | undefined;
  openAmount: string | number | null | undefined;
};

// Exported so list-page filter dropdowns (e.g. CreditMemosPage's status
// Select) can show the same color dot per option as this badge — same
// reuse shape as InvoicesPage.tsx building its own STATUS_OPTIONS off its
// local STATUS_CONFIG.
export const CREDIT_MEMO_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#9ca3af' },
  unapplied: { label: 'Unapplied', color: '#eab308' },
  partially_applied: { label: 'Partially Applied', color: '#7c3aed' },
  applied: { label: 'Applied', color: '#16a34a' },
  voided: { label: 'Voided', color: '#dc2626' },
};

export function creditMemoStatusKey({ hsCreditMemoStatus, appliedAmount, openAmount }: CreditMemoStatusInput): string {
  const status = (hsCreditMemoStatus ?? '').toLowerCase();
  if (status === 'voided' || status === 'draft') return status;
  const applied = Number(appliedAmount) || 0;
  const open = Number(openAmount) || 0;
  if (applied <= 0) return 'unapplied';
  if (open <= 0) return 'applied';
  return 'partially_applied';
}

export function creditMemoStatusLabel(input: CreditMemoStatusInput): string {
  const key = creditMemoStatusKey(input);
  return CREDIT_MEMO_STATUS_CONFIG[key]?.label ?? input.hsCreditMemoStatus ?? '—';
}

export function CreditMemoStatusBadge(props: CreditMemoStatusInput) {
  const key = creditMemoStatusKey(props);
  const config = CREDIT_MEMO_STATUS_CONFIG[key] ?? { label: props.hsCreditMemoStatus ?? '—', color: '#9ca3af' };
  return (
    <span className="status-badge">
      <span className="status-dot" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}

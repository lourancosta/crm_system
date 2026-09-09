// Same dot-plus-label pattern as the Quotes list table
// (QuotesPage.tsx's StatusBadge + STATUS_CONFIG) — kept as a shared
// component so association-panel cards elsewhere (Deal's Quotes panel, etc.)
// render status identically to the list view.
const QUOTE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: '#9ca3af' },
  PUBLISHED: { label: 'Published', color: '#16a34a' },
  AWAITING_COUNTERSIGNATURE: { label: 'Awaiting countersignature', color: '#eab308' },
  SIGNED: { label: 'Signed', color: '#16a34a' },
  EXPIRED: { label: 'Expired', color: '#dc2626' },
  ARCHIVED: { label: 'Archived', color: '#9ca3af' },
};

// isSigned overrides the raw status display — hsQuoteStatus stays a
// faithful mirror of HubSpot's own DRAFT/PUBLISHED/EXPIRED/ARCHIVED value
// (a quote can be simultaneously EXPIRED there and signed, since publish/
// expire and e-signature are independent in HubSpot), but a signed quote
// should always read as "Signed" here regardless of what that raw value is.
export function QuoteStatusBadge({ status, isSigned }: { status: string | null; isSigned?: boolean }) {
  if (isSigned) return <QuoteStatusBadge status="SIGNED" />;
  if (!status) return null;
  const config = QUOTE_STATUS_CONFIG[status] ?? { label: status, color: '#9ca3af' };
  return (
    <span className="status-badge">
      <span className="status-dot" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}

// Same dot-plus-label pattern as QuoteStatusBadge/InvoiceStatusBadge, for
// consistency across association-panel cards — colors match
// LicenseDetailContent.tsx's own STATUS_COLORS for the record's own field
// display.
const LICENSE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: '#16a34a' },
  expired: { label: 'Expired', color: '#dc2626' },
  revoked: { label: 'Revoked', color: '#9ca3af' },
};

export function LicenseStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const config = LICENSE_STATUS_CONFIG[status.toLowerCase()] ?? { label: status, color: '#9ca3af' };
  return (
    <span className="status-badge">
      <span className="status-dot" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}

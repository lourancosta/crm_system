// Rounds a numeric input's string value to a fixed number of decimals on
// blur — HTML's `step` attribute only affects the browser's own +/- steppers
// and native scroll/arrow-key nudging, it never actually constrains what a
// user can type or paste, so every "must be an integer" / "must be 2
// decimal places" field needs this too.
export function roundToDecimals(value: string, decimals: number): string {
  if (value.trim() === '') return value;
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toFixed(decimals);
}

export function roundToInteger(value: string): string {
  return roundToDecimals(value, 0);
}

// Cents-based helpers for CurrencyMaskedInput — the mask always operates on
// whole cents so a typed digit shifts existing digits left (0.12 -> 1.23 ->
// 123.45), never landing on an ambiguous decimal-point position.
export function centsFromDecimalString(value: string): number {
  const num = Number(value);
  if (!value || Number.isNaN(num)) return 0;
  return Math.round(Math.max(0, num) * 100);
}

export function decimalStringFromCents(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}

export function formatMaskedCents(cents: number): string {
  return (Math.max(0, cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Read-only display for a quantity value (DB DECIMAL columns carry far more
// precision than any real quantity ever needs, e.g. "1.000000") — whole
// numbers only, system-wide, mirrors formatCurrency's null-handling.
export function formatQuantity(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  return Math.round(num).toLocaleString('en-US');
}

// Read-only display for a percentage value (e.g. line-item/discount %) —
// caps to at most 2 decimals without padding whole numbers ("10" not
// "10.00"), same DB-precision-leak reasoning as formatQuantity above.
export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  return `${Math.round(num * 100) / 100}%`;
}

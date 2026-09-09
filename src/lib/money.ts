// Summing/subtracting several decimal amounts in JS floating point routinely
// lands a hair off the "clean" value (e.g. 124.45000000000002, or
// 124.44999999999999, instead of exactly 124.45). Harmless for display
// (rendering already rounds), but dangerous for any exact-equality or
// boundary comparison downstream (a balance that should read exactly 0
// never triggering a === 0 check; an "apply the full remaining amount"
// action getting rejected as "exceeds available balance" by a fraction of a
// cent). Round to the cent before anything compares against or persists a
// computed money value — see invoice.repository.ts's recalculateAmountBilled
// and creditMemoAvailableBalance for the bug this was written to fix.
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

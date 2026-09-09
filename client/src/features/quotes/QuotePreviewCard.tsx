import { Fragment } from 'react';
import { formatCurrency } from '../../shared/utils/currency';
import { useAvatarSrc } from '../../shared/hooks/useAvatarSrc';
import { BILLING_FREQUENCIES } from '../../shared/types/index';
import type { BillingFrequency, LineItem, Quote, QuoteDiscount } from '../../shared/types/index';
import styles from './QuotePreviewPage.module.css';

const COMPANY = {
  name: 'CRM System Inc',
  address: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zip: '00000',
  country: 'USA',
};

const BILLING_FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

// Matches LineItemsStep.tsx's own BILLING_PERIOD_MONTHS exactly — the
// recurring period (in months) each frequency represents, used to back out
// "Quantity per Month" from the persisted Total Quantity (quantity).
const BILLING_PERIOD_MONTHS: Record<BillingFrequency, number> = {
  one_time: 0,
  monthly: 1,
  quarterly: 3,
  annually: 12,
};

// Singular unit for the Future payments line (e.g. "$644.00 / month") —
// matches LineItemsStep.tsx's own BILLING_FREQUENCY_UNIT exactly.
const BILLING_FREQUENCY_UNIT: Record<BillingFrequency, string> = {
  one_time: '',
  monthly: 'month',
  quarterly: 'quarter',
  annually: 'year',
};

function isBillingFrequency(value: string | null): value is BillingFrequency {
  return !!value && (BILLING_FREQUENCIES as readonly string[]).includes(value);
}

function itemFrequency(item: LineItem): BillingFrequency {
  return isBillingFrequency(item.recurringbillingfrequency) ? item.recurringbillingfrequency : 'monthly';
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  // A bare "YYYY-MM-DD" (what the wizard's own date input stores locally,
  // before a quote is saved) must NOT go through the Date constructor's
  // UTC-midnight parsing — toLocaleDateString then renders that a full day
  // earlier for any timezone behind UTC, e.g. a 30-day expiration computed
  // from Settings would visibly show as 29 days. A full ISO timestamp (a
  // real persisted hsExpirationDate) already carries a specific moment and
  // parses correctly as-is.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(iso);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Total Quantity (item.quantity, i.e. "Quantity per Billing Frequency") was
// computed as quantityPerMonth × a frequency-dependent multiplier when the
// line item was saved (see LineItemsStep.tsx's recomputeTotalQuantity) — this
// just runs that same math backwards to recover the per-month seed value for
// display, since it's never separately persisted.
// Rounded to the nearest whole number — quantities are always integers
// throughout the app (see LineItemsStep.tsx's own roundToInteger on this same
// field), so a plain division's repeating decimal (e.g. a quantity that
// doesn't divide evenly into its term) is a display artifact, not a real
// fractional quantity.
function quantityPerMonth(item: LineItem): string {
  const quantity = Number(item.quantity) || 0;
  const freq = isBillingFrequency(item.recurringbillingfrequency) ? item.recurringbillingfrequency : 'monthly';
  const term = Number(item.hsTermInMonths) || 0;
  const multiplier = freq === 'one_time' ? term : BILLING_PERIOD_MONTHS[freq];
  const value = multiplier > 0 ? quantity / multiplier : quantity;
  return Math.round(value).toString();
}

// item.quantity comes straight from the DB's decimal(20,6) column (e.g.
// "5.000000") — always a whole number in practice, just not formatted as one.
function quantityPerBillingFrequency(item: LineItem): string {
  return Math.round(Number(item.quantity) || 0).toString();
}

// item.amount is already post-line-item-discount (effectiveUnitPrice ×
// quantity, computed server-side — see quote.repository.ts's createLineItem/
// updateLineItem), so no discount math needs to be redone here.
function preDiscountAmount(item: LineItem): number {
  return (Number(item.price) || 0) * (Number(item.quantity) || 0);
}

// item.quantity (Total Quantity, i.e. "Quantity per Billing Frequency") is
// only ONE occurrence of the item's billing frequency — a monthly item's
// quantity/amount is its price for a single month, not the whole contract.
// Number of payments over the contract mirrors LineItemsStep.tsx's own
// paymentsMultiplier exactly: one-time is always a single payment; a
// recurring item pays out either its Term's worth of periods, or a full
// year's worth (12 ÷ period) when no Term is set.
function paymentsMultiplier(item: LineItem): number {
  const freq = isBillingFrequency(item.recurringbillingfrequency) ? item.recurringbillingfrequency : 'monthly';
  if (freq === 'one_time') return 1;
  const period = BILLING_PERIOD_MONTHS[freq];
  const term = Number(item.hsTermInMonths) || 0;
  return (term > 0 ? term : 12) / period;
}

// TCV (Total Contract Value) for one line item — its one-period Total Item
// Price (item.amount) projected across every payment over the contract.
// "Total Item Price" in the table stays as the one-period amount (matches
// the real HubSpot column and the reference PDF, where every item happened
// to be one-time and so payments === 1), but subtotal/Total/Total contract
// value below all need this TCV-scaled figure or they'd just show what's
// charged in the first payment instead of the full contract's value.
function itemTcv(item: LineItem): number {
  return (Number(item.amount) || 0) * paymentsMultiplier(item);
}

function lineItemDiscountLabel(item: LineItem): string | null {
  if (item.discountType === 'amount') {
    const value = Number(item.discount) || 0;
    return value > 0 ? `after ${formatCurrency(value)} discount` : null;
  }
  const pct = Number(item.hsDiscountPercentage) || 0;
  return pct > 0 ? `after ${Math.round(pct * 100) / 100}% discount` : null;
}

// "for 3 years" once the term is a whole number of years, otherwise "for N
// months" (also covers any non-12-multiple term, e.g. 18 months) — one-time
// items have no term concept at all, so they show nothing.
function lineItemTermLabel(item: LineItem): string | null {
  const freq = isBillingFrequency(item.recurringbillingfrequency) ? item.recurringbillingfrequency : 'monthly';
  if (freq === 'one_time') return null;
  const term = Number(item.hsTermInMonths) || 0;
  if (term <= 0) return null;
  if (term >= 12 && term % 12 === 0) {
    const years = term / 12;
    return `for ${years} ${years === 1 ? 'year' : 'years'}`;
  }
  return `for ${term} ${term === 1 ? 'month' : 'months'}`;
}

// Groups line items by billing frequency, preserving first-appearance order —
// mirrors HubSpot's own quote PDF, which always breaks totals out by
// frequency (a "One-time subtotal" row even when that's the only group).
function groupByFrequency(items: LineItem[]): { freq: BillingFrequency; items: LineItem[] }[] {
  const order: BillingFrequency[] = [];
  const byFreq = new Map<BillingFrequency, LineItem[]>();
  for (const item of items) {
    const freq = itemFrequency(item);
    if (!byFreq.has(freq)) {
      byFreq.set(freq, []);
      order.push(freq);
    }
    byFreq.get(freq)!.push(item);
  }
  return order.map((freq) => ({ freq, items: byFreq.get(freq)! }));
}

// One-period amounts (matching the "Total Item Price" column, and the
// "Total" row below) — only "Total contract value" itself projects across
// every payment over the contract (see itemTcv).
function groupSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function groupDiscountTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + (preDiscountAmount(item) - (Number(item.amount) || 0)), 0);
}

type FuturePaymentGroup = { freq: BillingFrequency; amount: number; delayMonths: number; remainingPayments: number };

// Groups recurring items by (frequency, payments remaining after the one
// already covered by First payment) — two monthly items on different terms
// can't share one "$X/month for N payments" line, so each distinct
// combination gets its own. One-time items have nothing further to pay.
// Mirrors LineItemsStep.tsx's own futurePaymentGroups exactly, so the
// preview shows the same first-payment-vs-future-payments breakdown the
// wizard's own summary card already makes clear while editing.
function futurePaymentGroups(items: LineItem[]): FuturePaymentGroup[] {
  const groups = new Map<string, FuturePaymentGroup>();
  for (const item of items) {
    const freq = itemFrequency(item);
    if (freq === 'one_time') continue;
    const remainingPayments = Math.round(paymentsMultiplier(item)) - 1;
    if (remainingPayments <= 0) continue;
    const key = `${freq}-${remainingPayments}`;
    const amount = Number(item.amount) || 0;
    const existing = groups.get(key);
    if (existing) {
      existing.amount += amount;
    } else {
      groups.set(key, { freq, amount, delayMonths: BILLING_PERIOD_MONTHS[freq], remainingPayments });
    }
  }
  return Array.from(groups.values()).sort((a, b) => BILLING_PERIOD_MONTHS[a.freq] - BILLING_PERIOD_MONTHS[b.freq]);
}

// Applied sequentially in sort order (matching HubSpot) — mirrors
// quote.repository.ts's recalculateQuoteAmount and LineItemsStep.tsx's own
// discountBreakdown exactly, so the total shown here matches what's saved.
function discountBreakdown(discounts: QuoteDiscount[], subtotal: number): { id: string; amount: number }[] {
  let runningTotal = subtotal;
  return discounts.map((d) => {
    const value = Number(d.value) || 0;
    const amount = d.kind === 'percentage' ? runningTotal * (value / 100) : value;
    runningTotal = Math.max(0, runningTotal - amount);
    return { id: d.id, amount };
  });
}

// Deliberately narrower than the full Contact type — this card only ever
// renders these fields, and keeping it minimal lets both callers satisfy it
// without an extra per-contact fetch: QuotePreviewPage's public fetch
// (id/firstname/lastname/email/phone straight off the quote's own
// associated-contacts endpoint) and QuoteWizardPreview's full Contact[] both
// structurally match this shape already.
export type BuyerContact = {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
};

type Props = {
  quote: Quote;
  items: LineItem[];
  discounts: QuoteDiscount[];
  buyers: BuyerContact[];
};

// The actual quote-document look (logo, band, table, totals) — shared by the
// standalone full-page preview (QuotePreviewPage, fetches its own data by id)
// and the wizard's live side-panel preview (QuoteWizardPreview, builds this
// same Quote/LineItem/QuoteDiscount shape from in-progress, not-yet-saved
// wizard state) so the two never drift apart.
export function QuotePreviewCard({ quote, items, discounts, buyers }: Props) {
  const currency = quote.hsCurrency ?? 'USD';
  const groups = groupByFrequency(items);
  // "Total" is one-period, same basis as every group subtotal above it.
  // Mirrors LineItemsStep.tsx's own discountBasis exactly: once any
  // recurring item is present, the global discount is computed against
  // that one-period Total, not the full multi-payment TCV — a 10% discount
  // on a $1,000 one-period total must come off that $1,000, not off a much
  // larger annualized/term total contract value. Only when every item is
  // one-time (Total and TCV are the same single payment anyway) does the
  // discount get computed against the TCV figure directly. "Total contract
  // value" itself, though, always comes out of the TCV total either way —
  // it's the one figure that's supposed to reflect the whole contract.
  const lineItemsTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const tcvTotal = items.reduce((sum, item) => sum + itemTcv(item), 0);

  // It's otherwise not obvious how much of "Total contract value" is charged
  // right away versus billed later — First payment (with the global discount
  // already netted out) and Future payments make that split explicit,
  // exactly like the wizard's own summary card already does while the quote
  // is being built. Computed before hasMultiplePayments below since that
  // flag is itself derived from whether this list ends up non-empty.
  const paymentGroups = futurePaymentGroups(items);

  // Genuinely more than one payment requires not just a recurring frequency
  // label, but at least one item whose own Term actually implies a payment
  // beyond the first — a Monthly item with a 1-month Term is still labeled
  // "recurring" but never recurs, so futurePaymentGroups comes out empty for
  // it (see its own remainingPayments <= 0 guard) same as a true one-time
  // item. Mirrors LineItemsStep.tsx's own hasMultiplePayments exactly: once
  // there's a genuine future payment, the global discount is computed
  // against the one-period Total instead of the full multi-payment TCV — a
  // 10% discount on a $1,000 one-period total must come off that $1,000,
  // not off a much larger annualized/term total contract value. Otherwise
  // (Total and TCV are the same single payment anyway) the discount is
  // computed against the TCV figure directly. "Total contract value" itself
  // always comes out of the TCV total either way — it's the one figure
  // that's supposed to reflect the whole contract.
  const hasMultiplePayments = paymentGroups.length > 0;
  const discountBasis = hasMultiplePayments ? lineItemsTotal : tcvTotal;
  const globalDiscounts = discountBreakdown(discounts, discountBasis);
  const globalDiscountTotal = globalDiscounts.reduce((sum, d) => sum + d.amount, 0);
  const firstPaymentDisplay = Math.max(0, lineItemsTotal - globalDiscountTotal);

  // Total contract value is the sum of every REAL payment over the
  // contract — and a real payment is always a cents-rounded dollar amount,
  // never a raw floating-point fraction of a cent. Summing full-precision
  // payments and rounding only once at the end (Math.max(0, tcvTotal -
  // globalDiscountTotal), the previous approach) drifts from what HubSpot
  // itself shows by a few cents on quotes with several payments, because
  // it implicitly assumes every payment is identical down to sub-cent
  // precision. Rounding First payment and each Future payments group to
  // cents first — the same figures already shown above — then multiplying/
  // summing matches HubSpot exactly, since that's what actually gets
  // invoiced each period.
  const grandTotal = hasMultiplePayments
    ? Math.max(
        0,
        Math.round(firstPaymentDisplay * 100) / 100 +
          paymentGroups.reduce((sum, g) => sum + (Math.round(g.amount * 100) / 100) * g.remainingPayments, 0),
      )
    : Math.max(0, tcvTotal - globalDiscountTotal);

  const senderName = [quote.hsSenderFirstname, quote.hsSenderLastname].filter(Boolean).join(' ') || '—';
  const senderInitial = quote.hsSenderFirstname ? quote.hsSenderFirstname[0].toUpperCase() : '?';
  const senderAvatarSrc = useAvatarSrc(quote.hsSenderAvatarUrl);

  return (
    <div className={styles['qp-page']}>
      <div className={styles['qp-logo-row']}>
        <span className={styles['qp-logo']}>CRM System</span>
      </div>

      <div className={styles['qp-band']}>
        <h1 className={styles['qp-title']}>{quote.hsTitle ?? quote.hsDealName ?? 'Quote'}</h1>
        <div className={styles['qp-band-row']}>
          <div className={styles['qp-buyer']}>
            <div className={styles['qp-buyer-name']}>{quote.companyName || '—'}</div>
            {buyers.map((contact) => (
              <div key={contact.id} className={styles['qp-buyer-contact']}>
                <div className={styles['qp-buyer-contact-name']}>
                  {[contact.firstname, contact.lastname].filter(Boolean).join(' ') || '—'}
                </div>
                {contact.email && <div>{contact.email}</div>}
                {contact.phone && <div>{contact.phone}</div>}
              </div>
            ))}
          </div>
          <div className={styles['qp-meta']}>
            <div>Reference: {quote.hsQuoteNumber ?? quote.hubspotId}</div>
            <div>Quote created: {fmtDate(quote.createdAt)}</div>
            <div>Quote expires: {fmtDate(quote.hsExpirationDate)}</div>
            <div>Quote created by: {senderName}</div>
            {quote.hsSenderJobtitle && <div>{quote.hsSenderJobtitle}</div>}
            <div className={styles['qp-meta-gap']}>{quote.hsSenderEmail}</div>
            <div>{quote.hsSenderPhone}</div>
          </div>
        </div>
      </div>

      <div className={styles['qp-body']}>
        <div className={styles['qp-comments-box']}>
          <div className={styles['qp-comments-label']}>Comments from {quote.hsSenderFirstname || senderName}</div>
          {quote.hsComments && (
            <div className={styles['qp-comments-text']} dangerouslySetInnerHTML={{ __html: quote.hsComments }} />
          )}
        </div>

        <div className={styles['qp-section-title']}>Products &amp; Services</div>

        <table className={styles['qp-table']}>
          <thead>
            <tr>
              <th className={`${styles['qp-th']} ${styles['qp-th-product']}`}>Item &amp; Description</th>
              <th className={styles['qp-th']}>Billing Frequency</th>
              <th className={`${styles['qp-th']} ${styles['qp-th-right']}`}>Quantity per Month</th>
              <th className={`${styles['qp-th']} ${styles['qp-th-right']}`}>Unit Price per Month</th>
              <th className={`${styles['qp-th']} ${styles['qp-th-right']}`}>Quantity per Billing Frequency</th>
              <th className={`${styles['qp-th']} ${styles['qp-th-right']}`}>Total Item Price</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className={`${styles['qp-td']} ${styles['qp-td-empty']}`}>
                  No line items
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <Fragment key={group.freq}>
                  {group.items.map((item) => {
                    const discountLabel = lineItemDiscountLabel(item);
                    const termLabel = lineItemTermLabel(item);
                    return (
                      <tr key={item.id} className={styles['qp-tr']}>
                        <td className={`${styles['qp-td']} ${styles['qp-td-product']}`}>
                          <div className={styles['qp-item-name']}>{item.name ?? '—'}</div>
                          {item.description && <div className={styles['qp-item-desc']}>{item.description}</div>}
                        </td>
                        <td className={styles['qp-td']}>{BILLING_FREQUENCY_LABELS[group.freq]}</td>
                        <td className={`${styles['qp-td']} ${styles['qp-td-right']}`}>{quantityPerMonth(item)}</td>
                        <td className={`${styles['qp-td']} ${styles['qp-td-right']}`}>
                          {formatCurrency(item.price, currency)}
                        </td>
                        <td className={`${styles['qp-td']} ${styles['qp-td-right']}`}>{quantityPerBillingFrequency(item)}</td>
                        <td className={`${styles['qp-td']} ${styles['qp-td-right']} ${styles['qp-td-amount']}`}>
                          <div>{formatCurrency(item.amount, currency)}</div>
                          {discountLabel && <div className={styles['qp-tag-discount']}>{discountLabel}</div>}
                          {termLabel && <div className={styles['qp-tag-discount']}>{termLabel}</div>}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className={styles['qp-group-subtotal-row']}>
                    <td colSpan={5} className={`${styles['qp-td']} ${styles['qp-group-subtotal-label']}`}>
                      {BILLING_FREQUENCY_LABELS[group.freq]} subtotal
                    </td>
                    <td className={`${styles['qp-td']} ${styles['qp-td-right']} ${styles['qp-group-subtotal-value']}`}>
                      <div>{formatCurrency(groupSubtotal(group.items), currency)}</div>
                      {groupDiscountTotal(group.items) > 0 && (
                        <div className={styles['qp-tag-discount']}>
                          after {formatCurrency(groupDiscountTotal(group.items), currency)} discount
                        </div>
                      )}
                    </td>
                  </tr>
                </Fragment>
              ))
            )}
          </tbody>
        </table>

        <div className={styles['qp-totals']}>
          <div className={styles['qp-total-row']}>
            <span className={styles['qp-total-label']}>Total</span>
            <span className={styles['qp-total-value']}>{formatCurrency(lineItemsTotal, currency)}</span>
          </div>
          {discounts.map((discount, index) => (
            <div key={discount.id} className={styles['qp-total-row']}>
              <span className={styles['qp-total-label']}>{discount.name}</span>
              <span className={`${styles['qp-total-value']} ${styles['qp-total-value--discount']}`}>
                −{formatCurrency(globalDiscounts[index].amount, currency)}
              </span>
            </div>
          ))}

          {hasMultiplePayments && (
            <div className={styles['qp-payment-schedule']}>
              <div className={styles['qp-payment-schedule-row']}>
                <span className={styles['qp-payment-dot']} />
                <span className={styles['qp-total-label']}>First payment</span>
                <span className={styles['qp-payment-schedule-dots']} />
                <span className={`${styles['qp-total-value']} ${styles['qp-payment-value--bold']}`}>
                  {formatCurrency(firstPaymentDisplay, currency)}
                </span>
              </div>

              {paymentGroups.length > 0 && (
                <div className={styles['qp-future-payments-group']}>
                  <div className={styles['qp-payment-schedule-row']}>
                    <span className={`${styles['qp-payment-dot']} ${styles['qp-payment-dot--hollow']}`} />
                    <span className={styles['qp-total-label']}>Future payments</span>
                    <span className={styles['qp-payment-schedule-dots']} />
                    <span className={styles['qp-future-payment-line']}>
                      <strong>{formatCurrency(paymentGroups[0].amount, currency)}</strong>{' '}
                      <strong>/ {BILLING_FREQUENCY_UNIT[paymentGroups[0].freq]}</strong> starting{' '}
                      {paymentGroups[0].delayMonths} month{paymentGroups[0].delayMonths === 1 ? '' : 's'} after payment
                      for {paymentGroups[0].remainingPayments} payment
                      {paymentGroups[0].remainingPayments === 1 ? '' : 's'}
                    </span>
                  </div>
                  {paymentGroups.slice(1).map((g) => (
                    <div key={`${g.freq}-${g.remainingPayments}`} className={styles['qp-future-payment-extra-row']}>
                      <span className={styles['qp-future-payment-line']}>
                        <strong>{formatCurrency(g.amount, currency)}</strong>{' '}
                        <strong>/ {BILLING_FREQUENCY_UNIT[g.freq]}</strong> starting {g.delayMonths} month
                        {g.delayMonths === 1 ? '' : 's'} after payment for {g.remainingPayments} payment
                        {g.remainingPayments === 1 ? '' : 's'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={`${styles['qp-total-row']} ${styles['qp-total-row--grand']}`}>
            <span className={styles['qp-total-label']}>Total contract value</span>
            <span className={styles['qp-total-value']}>{formatCurrency(grandTotal, currency)}</span>
          </div>
        </div>

        <div className={styles['qp-terms-box']}>
          <div className={styles['qp-comments-label']}>Purchase terms</div>
          {quote.hsTerms && (
            <div className={styles['qp-comments-text']} dangerouslySetInnerHTML={{ __html: quote.hsTerms }} />
          )}
        </div>

        <div className={styles['qp-contact']}>
          <div className={styles['qp-comments-label']}>Questions? Contact me</div>
          <div className={styles['qp-contact-row']}>
            <div className={styles['qp-contact-avatar']}>
              {senderAvatarSrc ? (
                <img src={senderAvatarSrc} alt="" className={styles['qp-contact-avatar-image']} />
              ) : (
                senderInitial
              )}
            </div>
            <div>
              <div className={styles['qp-contact-name']}>{senderName}</div>
              {quote.hsSenderJobtitle && <div>{quote.hsSenderJobtitle}</div>}
              {quote.hsSenderEmail && <div>{quote.hsSenderEmail}</div>}
              {quote.hsSenderPhone && <div>{quote.hsSenderPhone}</div>}
            </div>
          </div>
          <div className={styles['qp-company-block']}>
            <div>{COMPANY.name}</div>
            <div>{COMPANY.address}</div>
            <div>
              {COMPANY.city}, {COMPANY.state} {COMPANY.zip}
            </div>
            <div>{COMPANY.country}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

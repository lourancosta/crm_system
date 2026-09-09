import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Copy, Info, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Select } from '../../../shared/components/Dropdown/Select';
import type { SelectOption } from '../../../shared/components/Dropdown/Select';
import { RowActionsMenu } from '../../../shared/components/Dropdown/RowActionsMenu';
import { Table } from '../../../shared/components/Table/Table';
import type { Column } from '../../../shared/components/Table/Table';
import { dragHandleColumn } from '../../../shared/components/Table/dragHandleColumn';
import { CurrencyMaskedInput } from '../../../shared/components/CurrencyMaskedInput/CurrencyMaskedInput';
import { useDropdownPosition } from '../../../shared/hooks/useDropdownPosition';
import { formatCurrency } from '../../../shared/utils/currency';
import { roundToDecimals, roundToInteger } from '../../../shared/utils/numberInput';
import { reorderByKey } from '../../../shared/utils/reorder';
import { ProductPickerModal } from '../../invoices/ProductPickerModal';
import { EditQuoteLineItemModal } from './EditQuoteLineItemModal';
import type { EditableQuoteLineItemFields } from './EditQuoteLineItemModal';
import { quotesApi } from '../api/quotes';
import { BILLING_FREQUENCIES, BILLING_START_TYPES } from '../../../shared/types/index';
import type {
  BillingFrequency,
  BillingStartType,
  LineItem,
  Product,
  QuoteDiscount,
  QuoteDiscountKind,
} from '../../../shared/types/index';
import styles from './LineItemsStep.module.css';

const CURRENCY = 'USD';

function isBillingStartType(value: string): value is BillingStartType {
  return (BILLING_START_TYPES as readonly string[]).includes(value);
}

const BILLING_FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

// Singular unit for the Future payments schedule (e.g. "US$644.00 / month").
const BILLING_FREQUENCY_UNIT: Record<BillingFrequency, string> = {
  one_time: '',
  monthly: 'month',
  quarterly: 'quarter',
  annually: 'year',
};

export const BILLING_FREQUENCY_OPTIONS: SelectOption<BillingFrequency>[] = BILLING_FREQUENCIES.map((value) => ({
  value,
  label: BILLING_FREQUENCY_LABELS[value],
}));

// The recurring period (in months) each frequency represents — the row's
// term must be an exact multiple of it (e.g. "Annually" only makes sense on
// a 12/24/36-month term, not a 5-month one). 'one_time' has no period, so
// any term is fine.
const BILLING_PERIOD_MONTHS: Record<BillingFrequency, number> = {
  one_time: 0,
  monthly: 1,
  quarterly: 3,
  annually: 12,
};

function isBillingFrequency(value: string): value is BillingFrequency {
  return (BILLING_FREQUENCIES as readonly string[]).includes(value);
}

// Total Quantity = quantity per month × a multiplier that depends on billing
// frequency: for One-time it's the row's own Term (variable), for
// Monthly/Quarterly/Annually it's their fixed period length (1/3/12,
// reusing BILLING_PERIOD_MONTHS) — Term doesn't affect quantity for those
// three, only their own MRR/ARR/TCV math does.
export function recomputeTotalQuantity(quantityPerMonth: string, termInMonths: string, billingFrequency: BillingFrequency): string {
  const perMonth = Number(quantityPerMonth) || 0;
  const multiplier = billingFrequency === 'one_time' ? Number(termInMonths) || 0 : BILLING_PERIOD_MONTHS[billingFrequency];
  // BFTQ (this table's "Total Quantity" / quantity field) is always a whole
  // unit count — round rather than truncate so e.g. 3 units/month × a
  // 1.5-month term (already invalid, but round-trips safely) doesn't lose
  // fractional units silently.
  return String(Math.round(perMonth * multiplier));
}

// Live, per-row check (not just at the moment the frequency is picked) —
// flags the Term field with a warning icon whenever its current value stops
// matching whatever frequency is currently selected, from either field
// changing. Requires at least 2 full periods (not just 1) — a Monthly row
// with a 1-month Term is a single payment same as One-time, so it isn't
// meaningfully "recurring" at all; the minimum that actually recurs is 2
// periods (e.g. Monthly needs a 2+ month Term, Quarterly a 6+ month Term).
function isTermValidForFrequency(row: Row): boolean {
  const period = BILLING_PERIOD_MONTHS[row.billingFrequency];
  if (period <= 0) return true;
  const term = Number(row.termInMonths) || 0;
  return term > 0 && term % period === 0 && term / period >= 2;
}

// Names the actual frequency and its actual minimum, instead of a generic
// "must be a multiple of billing frequency" — e.g. "Monthly items need a
// Term of at least 2 months" rather than making the user work out the
// period/minimum for whichever frequency is currently selected themselves.
function termWarningMessage(row: Row): string {
  const period = BILLING_PERIOD_MONTHS[row.billingFrequency];
  const minTerm = period * 2;
  const label = BILLING_FREQUENCY_LABELS[row.billingFrequency];
  return period > 1
    ? `${label} items need a Term of at least ${minTerm} months, in multiples of ${period}`
    : `${label} items need a Term of at least ${minTerm} months`;
}

// Portal-rendered (via useDropdownPosition, the same positioning hook every
// other dropdown/menu in the app uses) so the tooltip escapes the table's
// scroll container instead of being clipped by it — a plain CSS hover
// tooltip was getting cut off by the sticky header on the first row.
function TermWarningIndicator({ message }: { message: string }) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const { pos, menuRef, open, close } = useDropdownPosition();

  return (
    <span
      ref={triggerRef}
      className={styles['term-warning']}
      onMouseEnter={() => open(triggerRef.current)}
      onMouseLeave={close}
    >
      <AlertTriangle size={18} className={styles['term-warning-icon']} />
      {pos &&
        createPortal(
          <div
            ref={menuRef}
            className={`${styles['term-warning-tooltip']} ${pos.top !== undefined ? styles['term-warning-tooltip--below'] : styles['term-warning-tooltip--above']}`}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left + pos.width / 2, transform: 'translateX(-50%)' }}
          >
            {message}
          </div>,
          document.body,
        )}
    </span>
  );
}

// Same portal-positioning approach as TermWarningIndicator (escapes the
// table's own scroll/overflow clipping) — used for a plain informational
// hover, e.g. explaining an abbreviated column header.
function InfoTooltip({ text }: { text: string }) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const { pos, menuRef, open, close } = useDropdownPosition();

  return (
    <span
      ref={triggerRef}
      className={styles['header-info']}
      onMouseEnter={() => open(triggerRef.current)}
      onMouseLeave={close}
    >
      <Info size={13} className={styles['header-info-icon']} />
      {pos &&
        createPortal(
          <div
            ref={menuRef}
            className={`${styles['header-info-tooltip']} ${pos.top !== undefined ? styles['header-info-tooltip--below'] : styles['header-info-tooltip--above']}`}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left + pos.width / 2, transform: 'translateX(-50%)' }}
          >
            {text}
          </div>,
          document.body,
        )}
    </span>
  );
}

type Row = {
  id: string;
  // Only set for a row added via the product picker in this session — a row
  // loaded from the quote's existing line items has no productId to re-derive
  // a duplicate from, so it can't be cloned (mirrors CreateInvoiceForm.tsx's
  // exact rationale/behavior for invoice line items).
  productId: string;
  name: string;
  description: string;
  customerName: string;
  unitPrice: string;
  // Total Quantity — auto-computed from quantityPerMonth (see
  // recomputeTotalQuantity), never typed directly; blocked in both the table
  // and the edit modal.
  quantity: string;
  // User-editable — the one input driving Total Quantity, alongside Term
  // and Billing frequency.
  quantityPerMonth: string;
  discountKind: QuoteDiscountKind;
  discountPct: string;
  discountAmount: string;
  amount: string;
  billingStartType: BillingStartType;
  billingStartDate: string;
  billingStartDelayDays: string;
  billingStartDelayMonths: string;
  termInMonths: string;
  billingFrequency: BillingFrequency;
};

function rowFromLineItem(item: LineItem, productId = ''): Row {
  // The server value can carry more precision than the UI ever writes back
  // (e.g. a HubSpot-synced row stored with 6 decimal places) — round it the
  // same way a manual edit would on blur, so a freshly loaded row already
  // matches its own field's format instead of only reformatting once the
  // user happens to touch it.
  const termInMonths = roundToInteger(String(item.hsTermInMonths ?? ''));
  // One-time is the standard default for a freshly-added line item (matches
  // handleAddProduct, which creates one with no frequency sent at all) — a
  // recurring frequency is something the user has to actively opt into, and
  // then commit to a Term of at least 2 periods (see isTermValidForFrequency).
  const billingFrequency: BillingFrequency =
    item.recurringbillingfrequency && isBillingFrequency(item.recurringbillingfrequency)
      ? item.recurringbillingfrequency
      : 'one_time';
  const quantity = roundToInteger(String(item.quantity ?? '1'));
  // Reverse of recomputeTotalQuantity, for display when a row is (re)loaded
  // from the server — Total Quantity is the only thing actually persisted.
  const multiplier = billingFrequency === 'one_time' ? Number(termInMonths) || 0 : BILLING_PERIOD_MONTHS[billingFrequency];
  const quantityPerMonth = multiplier > 0 ? roundToInteger(String(Number(quantity) / multiplier)) : quantity;

  return {
    id: item.id,
    productId,
    name: item.name ?? '',
    description: item.description ?? '',
    customerName: item.customerName ?? '',
    unitPrice: roundToDecimals(String(item.price ?? '0'), 2),
    quantity,
    quantityPerMonth,
    discountKind: item.discountType === 'amount' ? 'amount' : 'percentage',
    discountPct: roundToDecimals(String(item.hsDiscountPercentage ?? '0'), 2),
    discountAmount: roundToDecimals(String(item.discount ?? '0'), 2),
    amount: item.amount ?? '0',
    billingStartType:
      item.hsBillingStartDelayType && isBillingStartType(item.hsBillingStartDelayType)
        ? item.hsBillingStartDelayType
        : 'at_payment',
    billingStartDate: item.hsRecurringBillingStartDate ? item.hsRecurringBillingStartDate.slice(0, 10) : '',
    billingStartDelayDays: item.hsBillingStartDelayDays ?? '',
    billingStartDelayMonths: item.hsBillingStartDelayMonths ?? '',
    termInMonths,
    billingFrequency,
  };
}

// Whichever of the three detail fields isn't the active type is stale once
// the type changes (e.g. picking "At payment" after a custom date was set) —
// blanking it locally here, and explicitly nulling it server-side in
// billingStartUpdatePayload below, is what keeps a later switch back to that
// same type from resurrecting the old value instead of starting blank.
function clearedBillingStartDetails(
  type: BillingStartType,
  fields: Pick<Row, 'billingStartDate' | 'billingStartDelayDays' | 'billingStartDelayMonths'>,
): Pick<Row, 'billingStartDate' | 'billingStartDelayDays' | 'billingStartDelayMonths'> {
  return {
    billingStartDate: type === 'custom_date' ? fields.billingStartDate : '',
    billingStartDelayDays: type === 'delayed_days' ? fields.billingStartDelayDays : '',
    billingStartDelayMonths: type === 'delayed_months' ? fields.billingStartDelayMonths : '',
  };
}

function billingStartUpdatePayload(row: Row) {
  return {
    hsBillingStartDelayType: row.billingStartType,
    hsRecurringBillingStartDate: row.billingStartType === 'custom_date' ? row.billingStartDate || null : null,
    hsBillingStartDelayDays:
      row.billingStartType === 'delayed_days' && row.billingStartDelayDays ? Number(row.billingStartDelayDays) : null,
    hsBillingStartDelayMonths:
      row.billingStartType === 'delayed_months' && row.billingStartDelayMonths
        ? Number(row.billingStartDelayMonths)
        : null,
  };
}

// Same shape as billingStartUpdatePayload, but for CreateLineItemInput,
// which (unlike UpdateLineItemInput) has no "explicitly clear" case since a
// freshly-created row has no stale previous value to worry about.
function billingStartCreatePayload(row: Row) {
  return {
    hsBillingStartDelayType: row.billingStartType,
    hsRecurringBillingStartDate:
      row.billingStartType === 'custom_date' && row.billingStartDate ? row.billingStartDate : undefined,
    hsBillingStartDelayDays:
      row.billingStartType === 'delayed_days' && row.billingStartDelayDays
        ? Number(row.billingStartDelayDays)
        : undefined,
    hsBillingStartDelayMonths:
      row.billingStartType === 'delayed_months' && row.billingStartDelayMonths
        ? Number(row.billingStartDelayMonths)
        : undefined,
  };
}

// Same "explicitly null the inactive one" pattern as billingStartUpdatePayload
// — switching a line item's discount kind needs to actually clear the other
// column, not leave a stale value ready to resurface if it's switched back.
function discountUpdatePayload(row: Row) {
  return {
    discountType: row.discountKind,
    hsDiscountPercentage: row.discountKind === 'percentage' ? Number(row.discountPct) || 0 : null,
    discount: row.discountKind === 'amount' ? Number(row.discountAmount) || 0 : null,
  };
}

function discountCreatePayload(row: Row) {
  return {
    discountType: row.discountKind,
    hsDiscountPercentage: row.discountKind === 'percentage' ? Number(row.discountPct) || 0 : undefined,
    discount: row.discountKind === 'amount' ? Number(row.discountAmount) || 0 : undefined,
  };
}

type DiscountRow = { id: string; name: string; kind: QuoteDiscountKind; value: string };

function rowFromDiscount(d: QuoteDiscount): DiscountRow {
  return { id: d.id, name: d.name, kind: d.kind, value: roundToDecimals(String(d.value ?? '0'), 2) };
}

// Applied sequentially in sort order (matching HubSpot) — each discount is
// calculated off the running total left over from the previous one, not
// independently off the original per-line total. Mirrors
// quote.repository.ts's recalculateQuoteAmount exactly, so the total shown
// here matches what the server persists.
function discountRowAmount(row: DiscountRow, runningTotal: number): number {
  const value = Number(row.value) || 0;
  return row.kind === 'percentage' ? runningTotal * (value / 100) : value;
}

// discountRows is already in sort order (fetched/appended that way), so a
// single left-to-right pass gives each row's own amount plus the running
// total it left behind for the next row.
function discountBreakdown(discountRows: DiscountRow[], subtotal: number): { id: string; amount: number }[] {
  let runningTotal = subtotal;
  return discountRows.map((row) => {
    const amount = discountRowAmount(row, runningTotal);
    runningTotal = Math.max(0, runningTotal - amount);
    return { id: row.id, amount };
  });
}

const DISCOUNT_KIND_OPTIONS: SelectOption<QuoteDiscountKind>[] = [
  { value: 'percentage', label: '%' },
  { value: 'amount', label: '$' },
];

type Props = {
  quoteId: string | null;
  // Reported up to CreateQuoteWizard so it can disable Save/Next while any
  // row has a validation issue (currently just the Term/frequency mismatch)
  // — otherwise the user could move on to later steps with a line item
  // that's actually inconsistent.
  onValidityChange?: (isValid: boolean) => void;
};

export function LineItemsStep({ quoteId, onValidityChange }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [discountRows, setDiscountRows] = useState<DiscountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);

  useEffect(() => {
    if (!quoteId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    Promise.all([quotesApi.getLineItems(quoteId), quotesApi.getDiscounts(quoteId)])
      .then(([items, discounts]) => {
        setRows(items.map((item) => rowFromLineItem(item)));
        setDiscountRows(discounts.map(rowFromDiscount));
      })
      .catch(() => setError('Failed to load line items'))
      .finally(() => setIsLoading(false));
  }, [quoteId]);

  useEffect(() => {
    onValidityChange?.(rows.every((r) => isTermValidForFrequency(r)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function patchRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function commitRow(row: Row) {
    if (!quoteId) return;
    try {
      const updated = await quotesApi.updateLineItem(quoteId, row.id, {
        quantity: Number(row.quantity) || 1,
        price: Number(row.unitPrice) || 0,
        description: row.description,
        customerName: row.customerName,
        ...discountUpdatePayload(row),
        ...billingStartUpdatePayload(row),
        hsTermInMonths: row.termInMonths ? Number(row.termInMonths) : undefined,
        recurringbillingfrequency: row.billingFrequency,
      });
      setRows((prev) => prev.map((r) => (r.id === row.id ? rowFromLineItem(updated) : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save line item');
    }
  }

  async function handleAddProduct(product: Product) {
    if (!quoteId) return;
    try {
      const created = await quotesApi.createLineItem(quoteId, { productId: product.id, quantity: 1, hsTermInMonths: 1 });
      setRows((prev) => [...prev, rowFromLineItem(created, product.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add line item');
    }
  }

  async function cloneRow(row: Row) {
    if (!quoteId || !row.productId) return;
    try {
      const created = await quotesApi.createLineItem(quoteId, {
        productId: row.productId,
        quantity: Number(row.quantity) || 1,
        price: Number(row.unitPrice) || 0,
        description: row.description,
        customerName: row.customerName,
        ...discountCreatePayload(row),
        ...billingStartCreatePayload(row),
        hsTermInMonths: row.termInMonths ? Number(row.termInMonths) : undefined,
        recurringbillingfrequency: row.billingFrequency,
      });
      setRows((prev) => [...prev, rowFromLineItem(created, row.productId)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone line item');
    }
  }

  async function removeRow(id: string) {
    if (!quoteId) return;
    try {
      await quotesApi.deleteLineItem(quoteId, id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove line item');
    }
  }

  function moveRow(draggedId: string, targetId: string) {
    const reordered = reorderByKey(rows, (r) => r.id, draggedId, targetId);
    if (reordered === rows) return;
    setRows(reordered);
    if (quoteId) {
      quotesApi.reorderLineItems(quoteId, reordered.map((r) => r.id)).catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to save new order');
      });
    }
  }

  // Enforces the term-length minimum for the picked frequency (e.g.
  // "Annually" needs a term of at least 12 months) — if the row's current
  // term doesn't meet it, the frequency change is rejected with an inline
  // error instead of being applied.
  // Always applies — mismatches against the current term are flagged live on
  // the Term field itself (see isTermValidForFrequency) rather than blocked
  // here, so switching frequency first and fixing the term after works too.
  function handleBillingFrequencySelect(row: Row, value: BillingFrequency) {
    const nextQuantity = recomputeTotalQuantity(row.quantityPerMonth, row.termInMonths, value);
    const patched: Row = { ...row, billingFrequency: value, quantity: nextQuantity };
    patchRow(row.id, { billingFrequency: value, quantity: nextQuantity });
    commitRow(patched);
  }

  async function handleEditSave(patch: EditableQuoteLineItemFields) {
    if (!editingRow) return;
    const patched: Row = {
      ...editingRow,
      description: patch.description,
      unitPrice: patch.unitPrice,
      // Total Quantity isn't editable from this modal — it stays whatever
      // recomputeTotalQuantity last set it to (see the table's Quantity per
      // month/Term/Billing frequency columns).
      discountKind: patch.discountKind,
      discountPct: patch.discountPct,
      discountAmount: patch.discountAmount,
      billingStartType: patch.billingStartType,
      ...clearedBillingStartDetails(patch.billingStartType, patch),
    };
    setRows((prev) => prev.map((r) => (r.id === patched.id ? patched : r)));
    await commitRow(patched);
    setEditingRow(null);
  }

  async function addDiscountRow() {
    if (!quoteId) return;
    try {
      const created = await quotesApi.createDiscount(quoteId, { name: 'Discount', kind: 'percentage', value: 0 });
      setDiscountRows((prev) => [...prev, rowFromDiscount(created)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add discount');
    }
  }

  function patchDiscountRow(id: string, patch: Partial<DiscountRow>) {
    setDiscountRows((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function commitDiscountRow(row: DiscountRow) {
    if (!quoteId) return;
    try {
      const updated = await quotesApi.updateDiscount(quoteId, row.id, {
        name: row.name,
        kind: row.kind,
        value: Number(row.value) || 0,
      });
      setDiscountRows((prev) => prev.map((d) => (d.id === row.id ? rowFromDiscount(updated) : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save discount');
    }
  }

  async function removeDiscountRow(id: string) {
    if (!quoteId) return;
    try {
      await quotesApi.deleteDiscount(quoteId, id);
      setDiscountRows((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove discount');
    }
  }

  // Quantity is a pure seat/unit count — Term no longer inflates it (see the
  // Term column below), so this is one payment period's pre-discount charge:
  // for Monthly that's one month, for Quarterly one quarter, etc.
  function rowPreDiscountAmount(row: Row): number {
    return (Number(row.unitPrice) || 0) * (Number(row.quantity) || 0);
  }

  // Net Price = pre-discount amount − the discount it works out to — still
  // just one payment period's line total, not the whole contract. Live off
  // whatever is currently typed (not waiting on the next save), unlike
  // TCV/MRR/ARR below. No tax field exists on a line item yet, so "Net Price
  // after tax" isn't computed here.
  //
  // A % discount reduces the pre-discount line total directly; a flat $
  // discount is a per-unit deduction (matches hs_discount's own real
  // semantics — same level as unit price, not a line-total lump sum), so it
  // gets multiplied by quantity same as unit price does.
  function rowNetPrice(row: Row): number {
    const quantity = Number(row.quantity) || 0;
    if (row.discountKind === 'amount') {
      const unitPrice = Number(row.unitPrice) || 0;
      const discountAmount = Number(row.discountAmount) || 0;
      return Math.max(0, unitPrice - discountAmount) * quantity;
    }
    const preDiscountAmount = rowPreDiscountAmount(row);
    const totalDiscount = preDiscountAmount * ((Number(row.discountPct) || 0) / 100);
    return preDiscountAmount - totalDiscount;
  }

  // Net price normalized to a monthly amount, same as HubSpot: Monthly = net
  // price as-is, Quarterly = net price ÷ 3, Annually = net price ÷ 12 —
  // BILLING_PERIOD_MONTHS already holds those same divisors. One-time line
  // items have no ongoing revenue rate, so MRR/ARR are both 0 for them.
  function rowMrr(row: Row): number {
    if (row.billingFrequency === 'one_time') return 0;
    return rowNetPrice(row) / BILLING_PERIOD_MONTHS[row.billingFrequency];
  }

  // With a Term set shorter than a year, ARR uses that term's own length
  // instead of assuming a full year (e.g. a $10/week item on a 6-week term
  // is $60 ARR, not $520) — algebraically MRR × term, since MRR is already
  // net price ÷ the frequency's period. But ARR is still only ever an
  // *annualized* figure, so a term longer than 12 months must NOT keep
  // multiplying past a year (a monthly item with a 24-month term isn't
  // $22,080 of "annual" revenue — that's the full TCV; ARR caps at the same
  // 12 months a no-term row already assumes). No term falls back to that
  // standard full-year assumption outright.
  function rowArr(row: Row): number {
    if (row.billingFrequency === 'one_time') return 0;
    const term = Number(row.termInMonths) || 0;
    const effectiveTerm = term > 0 ? Math.min(term, 12) : 12;
    return rowMrr(row) * effectiveTerm;
  }

  // Number of payments over the contract: a one-time charge is a single
  // payment; a recurring one is either the payments within its Term (term ÷
  // period), or a full year's worth (12 ÷ period) when no Term is set.
  function paymentsMultiplier(row: Row): number {
    if (row.billingFrequency === 'one_time') return 1;
    const period = BILLING_PERIOD_MONTHS[row.billingFrequency];
    const term = Number(row.termInMonths) || 0;
    return (term > 0 ? term : 12) / period;
  }

  // TCV = net price × number of payments over the contract period.
  function rowTcv(row: Row): number {
    return rowNetPrice(row) * paymentsMultiplier(row);
  }

  // Same payments-based projection as TCV, but pre-discount — keeps
  // Subtotal/Total/"Line item discounts" below on the same basis (whole
  // contract, not one payment period) so they still net out correctly.
  function rowPreDiscountTcv(row: Row): number {
    return rowPreDiscountAmount(row) * paymentsMultiplier(row);
  }

  const subtotal = rows.reduce((sum, r) => sum + rowPreDiscountTcv(r), 0);
  const total = rows.reduce((sum, r) => sum + rowTcv(r), 0);
  const discountTotal = subtotal - total;

  // "Due now" is what's charged immediately, regardless of frequency — one
  // payment period's Net Price for a recurring row, or the whole thing for a
  // One-time row (whose Net Price already IS its single payment).
  const dueNow = rows.reduce((sum, r) => sum + rowNetPrice(r), 0);

  // "Future payments" groups recurring rows by (frequency, how many payments
  // are left after the one already covered by Due Now) — two monthly rows on
  // different terms can't share one "$X/month for N payments" line, so each
  // distinct combination gets its own. One-time rows have nothing further to
  // pay, and neither does a recurring row whose own Term is exactly one
  // period (e.g. Monthly with a 1-month Term) — remainingPayments comes out
  // to 0 and it's excluded here too, same as a genuine one-time row.
  const futurePaymentGroups = (() => {
    const groups = new Map<
      string,
      { freq: BillingFrequency; amount: number; delayMonths: number; remainingPayments: number }
    >();
    for (const r of rows) {
      if (r.billingFrequency === 'one_time') continue;
      const remainingPayments = Math.round(paymentsMultiplier(r)) - 1;
      if (remainingPayments <= 0) continue;
      const key = `${r.billingFrequency}-${remainingPayments}`;
      const existing = groups.get(key);
      if (existing) {
        existing.amount += rowNetPrice(r);
      } else {
        groups.set(key, {
          freq: r.billingFrequency,
          amount: rowNetPrice(r),
          delayMonths: BILLING_PERIOD_MONTHS[r.billingFrequency],
          remainingPayments,
        });
      }
    }
    return Array.from(groups.values()).sort((a, b) => BILLING_PERIOD_MONTHS[a.freq] - BILLING_PERIOD_MONTHS[b.freq]);
  })();

  // When every line item is one-time — OR every recurring item's own Term
  // works out to exactly one period, so futurePaymentGroups ends up empty
  // anyway (a Monthly row with a 1-month Term is still labeled "recurring"
  // but never actually recurs) — "first payment" and "total contract value"
  // are the same single payment. The global discount is then naturally
  // computed against the whole contract value (there's nothing else to
  // apply it to), and the payment-schedule section (First payment / Future
  // payments) is redundant and gets hidden, since it would show a First
  // payment line with no Future payments below it — not wrong, just
  // pointless restating of the same single number twice. As soon as there's
  // a genuine future payment, the section is shown and the discount is
  // computed against the First payment amount instead — a 10% discount on a
  // $1,000 first payment must come off that $1,000, not off a much larger
  // multi-payment total contract value (which would zero out or
  // over-discount the first payment for no reason). Either way, the
  // resulting dollar discount then comes straight off grandTotal too, since
  // Total contract value is just the sum of every payment and the First
  // payment is one of them.
  const hasMultiplePayments = futurePaymentGroups.length > 0;
  const discountBasis = hasMultiplePayments ? dueNow : total;
  const discountRowAmounts = discountBreakdown(discountRows, discountBasis);
  const globalDiscountTotal = discountRowAmounts.reduce((sum, d) => sum + d.amount, 0);

  const firstPaymentDisplay = Math.max(0, dueNow - globalDiscountTotal);

  // Total contract value is the sum of every REAL payment over the
  // contract — and a real payment is always a cents-rounded dollar amount,
  // never a raw floating-point fraction of a cent. Summing full-precision
  // payments and rounding only once at the end (Math.max(0, total -
  // globalDiscountTotal), the previous approach) drifts from what HubSpot
  // itself shows by a few cents on quotes with several payments, because
  // it's implicitly assuming every payment is exactly identical down to
  // sub-cent precision. Rounding First payment and each Future payments
  // group to cents first — the same figures already shown on screen — then
  // multiplying/summing matches HubSpot exactly, since that's what actually
  // gets invoiced each period.
  const grandTotal = hasMultiplePayments
    ? Math.max(
        0,
        Math.round(firstPaymentDisplay * 100) / 100 +
          futurePaymentGroups.reduce((sum, g) => sum + (Math.round(g.amount * 100) / 100) * g.remainingPayments, 0),
      )
    : Math.max(0, total - globalDiscountTotal);

  const columns: Column<Row>[] = [
    dragHandleColumn<Row>((row) => row.id),
    {
      key: 'name',
      header: 'Product name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{row.name || '—'}</span>
          <span className={styles['row-actions-cell']}>
            <RowActionsMenu
              actions={[
                { label: 'Edit', icon: Pencil, onClick: () => setEditingRow(row) },
                {
                  label: 'Clone',
                  icon: Copy,
                  onClick: () => cloneRow(row),
                  disabled: !row.productId,
                  title: !row.productId ? "This line item isn't tied to a product, so it can't be cloned" : undefined,
                },
                { label: 'Delete', icon: Trash2, onClick: () => removeRow(row.id), variant: 'danger' },
              ]}
            />
          </span>
        </div>
      ),
    },
    {
      key: 'billingFrequency',
      header: 'Billing frequency',
      render: (row) => (
        <Select
          value={row.billingFrequency}
          onChange={(value) => handleBillingFrequencySelect(row, value)}
          options={BILLING_FREQUENCY_OPTIONS}
          ariaLabel="Billing frequency"
          className={styles['line-item-select']}
        />
      ),
    },
    {
      key: 'termInMonths',
      header: 'Term (months)',
      render: (row) => (
        <div className={styles['term-cell']}>
          <input
            type="number"
            step="1"
            min="1"
            className={`${styles['table-input']} ${styles['term-input']}${isTermValidForFrequency(row) ? '' : ` ${styles['term-input--invalid']}`}`}
            value={row.termInMonths}
            onChange={(e) => patchRow(row.id, { termInMonths: e.target.value })}
            onBlur={() => {
              // Term is always whole months — `step="1"` only affects the
              // browser's own +/- steppers, it doesn't stop someone typing
              // or pasting a decimal, so round explicitly here.
              const term = roundToInteger(row.termInMonths);
              // Term only feeds Total Quantity for One-time billing (see
              // recomputeTotalQuantity) — Monthly/Quarterly/Annually use a
              // fixed period instead, so there's nothing to recompute for them.
              if (row.billingFrequency === 'one_time') {
                const nextQuantity = recomputeTotalQuantity(row.quantityPerMonth, term, row.billingFrequency);
                patchRow(row.id, { termInMonths: term, quantity: nextQuantity });
                commitRow({ ...row, termInMonths: term, quantity: nextQuantity });
              } else {
                patchRow(row.id, { termInMonths: term });
                commitRow({ ...row, termInMonths: term });
              }
            }}
            placeholder="e.g. 12"
            style={{ width: 85 }}
          />
          {!isTermValidForFrequency(row) && <TermWarningIndicator message={termWarningMessage(row)} />}
        </div>
      ),
    },
    {
      key: 'quantityPerMonth',
      header: 'QTY MONTH',
      render: (row) => (
        <input
          type="number"
          step="1"
          min="0"
          className={styles['table-input']}
          value={row.quantityPerMonth}
          onChange={(e) => patchRow(row.id, { quantityPerMonth: e.target.value })}
          onBlur={() => {
            const perMonth = roundToInteger(row.quantityPerMonth);
            const nextQuantity = recomputeTotalQuantity(perMonth, row.termInMonths, row.billingFrequency);
            patchRow(row.id, { quantityPerMonth: perMonth, quantity: nextQuantity });
            commitRow({ ...row, quantityPerMonth: perMonth, quantity: nextQuantity });
          }}
          style={{ width: 75 }}
        />
      ),
    },
    {
      key: 'quantity',
      header: (
        <span className={styles['header-with-info']}>
          BFTQ
          <InfoTooltip text="Billing frequency total quantity for each line item" />
        </span>
      ),
      render: (row) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.quantity}</span>,
    },
    {
      key: 'unitPrice',
      header: 'Unit price',
      render: (row) => (
        <CurrencyMaskedInput
          className={styles['table-input']}
          value={row.unitPrice}
          onChange={(v) => patchRow(row.id, { unitPrice: v })}
          onBlur={() => commitRow(row)}
          style={{ width: 120 }}
        />
      ),
    },
    {
      key: 'discount',
      header: 'Unit discount',
      render: (row) => (
        <div className={styles['line-item-discount-group']}>
          <Select
            value={row.discountKind}
            onChange={(value) => {
              patchRow(row.id, { discountKind: value });
              commitRow({ ...row, discountKind: value });
            }}
            options={DISCOUNT_KIND_OPTIONS}
            ariaLabel="Discount kind"
            className={styles['discount-kind-select']}
          />
          {row.discountKind === 'percentage' ? (
            <input
              type="number"
              step="0.01"
              min="0"
              max={100}
              className={styles['line-item-discount-input']}
              value={row.discountPct}
              onChange={(e) => patchRow(row.id, { discountPct: e.target.value })}
              onBlur={() => {
                const discountPct = roundToDecimals(row.discountPct, 2);
                patchRow(row.id, { discountPct });
                commitRow({ ...row, discountPct });
              }}
            />
          ) : (
            <CurrencyMaskedInput
              className={styles['line-item-discount-input']}
              value={row.discountAmount}
              onChange={(v) => patchRow(row.id, { discountAmount: v })}
              onBlur={() => commitRow(row)}
            />
          )}
        </div>
      ),
    },
    {
      key: 'netPrice',
      header: 'Net Price',
      render: (row) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(rowNetPrice(row), CURRENCY)}</span>,
    },
    {
      key: 'mrr',
      header: 'MRR',
      render: (row) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(rowMrr(row), CURRENCY)}</span>,
    },
    {
      key: 'arr',
      header: 'ARR',
      render: (row) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(rowArr(row), CURRENCY)}</span>,
    },
    {
      key: 'amount',
      header: 'TCV',
      render: (row) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(rowTcv(row), CURRENCY)}</span>,
    },
  ];

  if (!quoteId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Complete the previous steps first to add line items.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading line items…</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>Line Items</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        Review the line items you want shown in your quote.
      </p>
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 }}>
        <span className={styles['add-line-item']}>
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowProductPicker(true)}>
            + Add line item
          </Button>
        </span>
      </div>

      {rows.length === 0 ? (
        <div className={styles['line-items-table']}>
          <div className={styles['line-items-empty']}>
            <h4 className={styles['line-items-empty-title']}>Add line items to this quote</h4>
            <p className={styles['line-items-empty-description']}>Add line items for the products you're quoting.</p>
            <Button type="button" onClick={() => setShowProductPicker(true)}>
              Select from product library
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles['line-items-table']}>
          <Table
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            emptyMessage="No line items yet."
            onReorder={moveRow}
            maxVisibleRows={10}
          />
        </div>
      )}

      <div className={styles['summary-card']}>
        <div className={styles['summary-title']}>Summary</div>

        <div className={styles['summary-row']}>
          <span className={styles['summary-label']}>Contract subtotal</span>
          <span className={styles['summary-dots']} />
          <span className={`${styles['summary-value']} ${styles['summary-value--bold']}`}>
            {formatCurrency(subtotal, CURRENCY)}
          </span>
        </div>

        {discountTotal > 0 && (
          <div className={`${styles['summary-row']} ${styles['summary-row--nested']}`}>
            <span className={`${styles['summary-label']} ${styles['summary-label--muted']}`}>Line item discounts</span>
            <span className={styles['summary-dots']} />
            <span className={`${styles['summary-value']} ${styles['summary-value--accent']}`}>
              −{formatCurrency(discountTotal, CURRENCY)}
            </span>
          </div>
        )}

        {discountRows.map((row, index) => (
          <div key={row.id} className={`${styles['summary-row']} ${styles['summary-row--nested']} ${styles['discount-row']}`}>
            <div className={styles['discount-name-block']}>
              <label className={styles['discount-name-static-label']}>One-time discount *</label>
              <input
                type="text"
                className={styles['discount-name-input']}
                value={row.name}
                onChange={(e) => patchDiscountRow(row.id, { name: e.target.value })}
                onBlur={() => commitDiscountRow(row)}
                placeholder="Enter a discount name"
              />
            </div>
            <div className={styles['discount-right']}>
              <div className={styles['discount-value-group']}>
                <Select
                  value={row.kind}
                  onChange={(value) => {
                    patchDiscountRow(row.id, { kind: value });
                    commitDiscountRow({ ...row, kind: value });
                  }}
                  options={DISCOUNT_KIND_OPTIONS}
                  ariaLabel="Discount type"
                  className={styles['discount-kind-select']}
                />
                {row.kind === 'percentage' ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={100}
                    className={styles['discount-value-input']}
                    value={row.value}
                    onChange={(e) => patchDiscountRow(row.id, { value: e.target.value })}
                    onBlur={() => {
                      const value = roundToDecimals(row.value, 2);
                      patchDiscountRow(row.id, { value });
                      commitDiscountRow({ ...row, value });
                    }}
                  />
                ) : (
                  <CurrencyMaskedInput
                    className={styles['discount-value-input']}
                    value={row.value}
                    onChange={(v) => patchDiscountRow(row.id, { value: v })}
                    onBlur={() => commitDiscountRow(row)}
                  />
                )}
              </div>
              <button
                type="button"
                className={styles['discount-remove-btn']}
                onClick={() => removeDiscountRow(row.id)}
                aria-label="Remove discount"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <span className={`${styles['summary-value']} ${styles['summary-value--accent']} ${styles['discount-amount']}`}>
              −{formatCurrency(discountRowAmounts[index].amount, CURRENCY)}
            </span>
          </div>
        ))}

        <div className={`${styles['summary-row']} ${styles['summary-row--nested']}`}>
          <button type="button" className={styles['add-discount-link']} onClick={addDiscountRow}>
            + Add discount
          </button>
        </div>

        {hasMultiplePayments && (
          <div className={styles['payment-schedule']}>
            <div className={styles['payment-schedule-row']}>
              <span className={styles['payment-dot']} />
              <span className={styles['summary-label']}>First payment</span>
              <span className={`${styles['summary-dots']} ${styles['payment-schedule-dots']}`} />
              <span className={`${styles['summary-value']} ${styles['summary-value--bold']}`}>
                {formatCurrency(firstPaymentDisplay, CURRENCY)}
              </span>
            </div>

            {futurePaymentGroups.length > 0 && (
              <div className={styles['future-payments-group']}>
                <div className={styles['payment-schedule-row']}>
                  <span className={`${styles['payment-dot']} ${styles['payment-dot--hollow']}`} />
                  <span className={styles['summary-label']}>Future payments</span>
                  <span className={`${styles['summary-dots']} ${styles['payment-schedule-dots']}`} />
                  <span className={styles['future-payment-line']}>
                    <strong>{formatCurrency(futurePaymentGroups[0].amount, CURRENCY)}</strong>{' '}
                    <strong>/ {BILLING_FREQUENCY_UNIT[futurePaymentGroups[0].freq]}</strong> starting{' '}
                    {futurePaymentGroups[0].delayMonths} month{futurePaymentGroups[0].delayMonths === 1 ? '' : 's'} after
                    payment for {futurePaymentGroups[0].remainingPayments} payment
                    {futurePaymentGroups[0].remainingPayments === 1 ? '' : 's'}
                  </span>
                </div>
                {futurePaymentGroups.slice(1).map((g) => (
                  <div key={`${g.freq}-${g.remainingPayments}`} className={styles['future-payment-extra-row']}>
                    <span className={styles['future-payment-line']}>
                      <strong>{formatCurrency(g.amount, CURRENCY)}</strong> <strong>/ {BILLING_FREQUENCY_UNIT[g.freq]}</strong>{' '}
                      starting {g.delayMonths} month{g.delayMonths === 1 ? '' : 's'} after payment for {g.remainingPayments}{' '}
                      payment{g.remainingPayments === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`${styles['summary-row']} ${styles['summary-row--bold']}`}>
          <span className={styles['summary-label']}>Total contract value</span>
          <span className={styles['summary-dots']} />
          <span className={styles['summary-value']}>{formatCurrency(grandTotal, CURRENCY)}</span>
        </div>
      </div>

      {showProductPicker && <ProductPickerModal onPick={handleAddProduct} onClose={() => setShowProductPicker(false)} />}

      {editingRow && (
        <EditQuoteLineItemModal
          initial={{
            name: editingRow.name,
            description: editingRow.description,
            unitPrice: editingRow.unitPrice,
            discountKind: editingRow.discountKind,
            discountPct: editingRow.discountPct,
            discountAmount: editingRow.discountAmount,
            billingStartType: editingRow.billingStartType,
            billingStartDate: editingRow.billingStartDate,
            billingStartDelayDays: editingRow.billingStartDelayDays,
            billingStartDelayMonths: editingRow.billingStartDelayMonths,
          }}
          onSave={handleEditSave}
          onClose={() => setEditingRow(null)}
        />
      )}
    </div>
  );
}

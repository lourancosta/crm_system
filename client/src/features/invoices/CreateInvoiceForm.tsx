import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../shared/components/Button/Button';
import { Select } from '../../shared/components/Dropdown/Select';
import type { SelectOption } from '../../shared/components/Dropdown/Select';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import { CompanySearchSelect } from '../../shared/components/SearchSelect/CompanySearchSelect';
import { ContactSearchSelect } from '../../shared/components/SearchSelect/ContactSearchSelect';
import { Table } from '../../shared/components/Table/Table';
import type { Column } from '../../shared/components/Table/Table';
import { dragHandleColumn } from '../../shared/components/Table/dragHandleColumn';
import { TruncatedText } from '../../shared/components/TruncatedText/TruncatedText';
import { CurrencyMaskedInput } from '../../shared/components/CurrencyMaskedInput/CurrencyMaskedInput';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { formatCurrency } from '../../shared/utils/currency';
import { roundToDecimals, roundToInteger } from '../../shared/utils/numberInput';
import { reorderByKey } from '../../shared/utils/reorder';
import { invoicesApi } from './api/invoices';
import { creditMemosApi } from '../credit-memos/api/creditMemos';
import { ProductPickerModal } from './ProductPickerModal';
import { EditLineItemRowModal } from './EditLineItemRowModal';
import type { EditableLineItemFields } from './EditLineItemRowModal';
import type {
  AvailableCreditMemo,
  Company,
  Contact,
  CreateInvoiceInput,
  CreditMemoApplication,
  Invoice,
  InvoiceDiscount,
  InvoiceDiscountKind,
  LineItem,
  Product,
} from '../../shared/types/index';
import styles from './CreateInvoiceForm.module.css';

const CURRENCY = 'USD';

type PaymentTerm = 'net10' | 'net15' | 'net30' | 'net60' | 'net90' | 'custom';

const NET_DAYS: Record<Exclude<PaymentTerm, 'custom'>, number> = {
  net10: 10,
  net15: 15,
  net30: 30,
  net60: 60,
  net90: 90,
};

// Reverses NET_DAYS for editing an existing invoice — falls back to "Custom
// date" when the stored day count doesn't match one of the fixed options.
function netDaysToTerm(days: string | null): PaymentTerm {
  const n = Number(days);
  const match = (Object.entries(NET_DAYS) as [Exclude<PaymentTerm, 'custom'>, number][]).find(([, d]) => d === n);
  return match ? match[0] : 'custom';
}

const PAYMENT_TERM_OPTIONS: SelectOption<PaymentTerm>[] = [
  { value: 'net10', label: 'Net 10' },
  { value: 'net15', label: 'Net 15' },
  { value: 'net30', label: 'Net 30' },
  { value: 'net60', label: 'Net 60' },
  { value: 'net90', label: 'Net 90' },
  { value: 'custom', label: 'Custom date' },
];

export type InvoiceType = 'reseller' | 'msp';
const TYPE_OPTIONS: SelectOption<InvoiceType>[] = [
  { value: 'reseller', label: 'Reseller' },
  { value: 'msp', label: 'MSP' },
];

type LineItemRow = {
  key: string;
  // Present only for a row loaded from an existing invoice — distinguishes
  // "already on the invoice" (mutate via updateLineItem/deleteLineItem) from
  // "added in this editing session" (mutate via createLineItem) when saving
  // edits. Absent (including on a cloned row) means "new".
  id?: string;
  productId: string;
  name: string;
  description: string;
  // Which end customer this line item bills to — groups/subtotals line
  // items on the invoice preview and detail page (see InvoicePreviewPage.tsx).
  customerName: string;
  unitPrice: string;
  quantity: string;
  discountKind: InvoiceDiscountKind;
  discountPct: string;
  discountAmount: string;
};

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : todayInput();
}

// Existing line items aren't necessarily tied to a product still present in
// our synced product catalog (many were created directly from HubSpot, with
// no productId reference at all) — so a loaded row deliberately carries no
// productId. It can still be edited/removed; it just can't be cloned (there's
// no product to re-derive a duplicate from).
function rowFromLineItem(item: LineItem): LineItemRow {
  return {
    key: item.id,
    id: item.id,
    productId: '',
    name: item.name ?? '',
    description: item.description ?? '',
    customerName: item.customerName ?? '',
    // Round on load, same as the onBlur handlers below — a server value can
    // carry more precision than the UI ever writes back (e.g. a
    // HubSpot-synced row stored with extra decimal places), so a freshly
    // loaded row must already match its own field's format instead of only
    // reformatting once the user happens to touch it.
    unitPrice: roundToDecimals(String(item.price ?? '0'), 2),
    quantity: item.quantity ?? '1',
    discountKind: item.discountType === 'amount' ? 'amount' : 'percentage',
    discountPct: roundToDecimals(String(item.hsDiscountPercentage ?? '0'), 2),
    discountAmount: roundToDecimals(String(item.discount ?? '0'), 2),
  };
}

function rowFromProduct(product: Product): LineItemRow {
  return {
    key: crypto.randomUUID(),
    productId: product.id,
    name: product.name ?? '',
    description: product.description ?? '',
    customerName: '',
    unitPrice: product.hsPriceUsd ?? '0',
    quantity: '1',
    discountKind: 'percentage',
    discountPct: '0',
    discountAmount: '0',
  };
}

// A line item carried over from another invoice via Clone — already resolved
// to a productId server-side (see invoice.service.ts's getInvoiceClonePreview),
// so unlike rowFromLineItem this one *is* cloneable/editable like any other
// freshly-added row. No `id`: it's a new line item on the new invoice.
function rowFromCloneLineItem(item: CloneLineItemSeed): LineItemRow {
  return {
    key: crypto.randomUUID(),
    productId: item.productId,
    name: item.name,
    description: item.description,
    customerName: item.customerName,
    unitPrice: String(item.price),
    quantity: String(item.quantity),
    discountKind: item.discountType,
    discountPct: String(item.hsDiscountPercentage),
    discountAmount: String(item.discount),
  };
}

// Amount = unit price * quantity, minus the unit discount — a % discount
// reduces the pre-discount line total directly; a flat $ discount is a
// per-unit deduction (same level as unit price), matching quotes' Net Price
// and the real hs_discount property's own semantics.
function rowAmount(row: LineItemRow): number {
  const price = Number(row.unitPrice) || 0;
  const qty = Number(row.quantity) || 0;
  if (row.discountKind === 'amount') {
    const discountAmount = Number(row.discountAmount) || 0;
    return Math.max(0, price - discountAmount) * qty;
  }
  const discountPct = Number(row.discountPct) || 0;
  return price * qty * (1 - discountPct / 100);
}

// Same "explicitly null the inactive one" pattern used elsewhere for
// billing-start-style kind switches — every save resends the full row, so
// this keeps whichever of discount/hsDiscountPercentage isn't active from
// resurfacing a stale value if the kind is switched back later.
function discountPayload(row: LineItemRow) {
  return {
    discountType: row.discountKind,
    hsDiscountPercentage: row.discountKind === 'percentage' ? Number(row.discountPct) || 0 : null,
    discount: row.discountKind === 'amount' ? Number(row.discountAmount) || 0 : null,
  };
}

// Same idea, but for CreateLineItemInput, which has no "explicitly clear"
// case since a freshly-created row has no stale previous value.
function discountCreatePayload(row: LineItemRow) {
  return {
    discountType: row.discountKind,
    hsDiscountPercentage: row.discountKind === 'percentage' ? Number(row.discountPct) || 0 : undefined,
    discount: row.discountKind === 'amount' ? Number(row.discountAmount) || 0 : undefined,
  };
}

// A global/invoice-level discount, applied to the running total directly
// rather than to any one line item - e.g. a loyalty or negotiated discount.
// Same id-presence convention as LineItemRow: `id` set means "already saved
// on this invoice" (mutate via updateDiscount/deleteDiscount), absent means
// "added in this editing session" (mutate via createDiscount).
type DiscountRow = {
  key: string;
  id?: string;
  name: string;
  kind: InvoiceDiscountKind;
  value: string;
};

function rowFromDiscount(d: InvoiceDiscount): DiscountRow {
  return { key: d.id, id: d.id, name: d.name, kind: d.kind, value: roundToDecimals(String(d.value ?? '0'), 2) };
}

function newDiscountRow(): DiscountRow {
  return { key: crypto.randomUUID(), name: '', kind: 'percentage', value: '0' };
}

function rowFromCloneDiscount(d: CloneDiscountSeed): DiscountRow {
  return { key: crypto.randomUUID(), name: d.name, kind: d.kind, value: roundToDecimals(String(d.value), 2) };
}

// Every global discount is computed off the same post-line-item-discount
// running total (not compounded through each other) - mirrors
// invoice.repository.ts's recalculateAmountBilled exactly, so the total
// shown here matches what the server persists.
function discountRowAmount(row: DiscountRow, base: number): number {
  const value = Number(row.value) || 0;
  return row.kind === 'percentage' ? base * (value / 100) : value;
}

const DISCOUNT_KIND_OPTIONS: SelectOption<InvoiceDiscountKind>[] = [
  { value: 'percentage', label: '%' },
  { value: 'amount', label: '$' },
];

// A credit memo's balance applied toward this invoice — same id-presence
// convention as DiscountRow (id set = already saved, mutate via update/
// delete; absent = added this session, mutate via create).
type CreditMemoApplicationRow = {
  key: string;
  id?: string;
  creditMemoId: string;
  amount: string;
};

function rowFromCreditMemoApplication(a: CreditMemoApplication): CreditMemoApplicationRow {
  return { key: a.id, id: a.id, creditMemoId: a.creditMemoId, amount: a.amount };
}

function newCreditMemoApplicationRow(creditMemoId: string): CreditMemoApplicationRow {
  return { key: crypto.randomUUID(), creditMemoId, amount: '0' };
}

function creditMemoLabel(cm: AvailableCreditMemo): string {
  return `${cm.hsNumber || 'Credit memo'} (Available balance: ${formatCurrency(cm.availableBalance, CURRENCY)})`;
}

// Street address on its own line, "City, State Zip" on the next, and country
// on its own — each line only appears when it has content.
function companyAddressLines(company: Company): string[] {
  const stateZip = [company.state, company.zip].filter(Boolean).join(' ');
  const cityStateZip = [company.city, stateZip].filter(Boolean).join(', ');
  return [company.address, cityStateZip, company.country].filter((line): line is string => !!line);
}

export const CREATE_INVOICE_FORM_ID = 'create-invoice-form';

export type InitialInvoiceData = {
  invoice: Invoice;
  lineItems: LineItem[];
  discounts: InvoiceDiscount[];
  creditMemoApplications: CreditMemoApplication[];
  company: Company;
  contact: Contact;
};

export type CloneLineItemSeed = {
  productId: string;
  name: string;
  description: string;
  customerName: string;
  price: number;
  quantity: number;
  hsDiscountPercentage: number;
  discount: number;
  discountType: InvoiceDiscountKind;
};

export type CloneDiscountSeed = {
  name: string;
  kind: InvoiceDiscountKind;
  value: number;
};

// Pre-fills a brand-new invoice (Clone) with another invoice's data — unlike
// `initial`, this never puts the form in edit mode: invoice date/payment
// term/invoice number still default the normal create-mode way, and Save
// goes through `onSubmit` (a real create), never invoicesApi.update.
export type CloneInvoiceSeed = {
  company: Company | null;
  contact: Contact | null;
  typeObj: InvoiceType;
  lineItems: CloneLineItemSeed[];
  discounts: CloneDiscountSeed[];
};

type Props = {
  // When set, the form pre-fills from and saves against this existing
  // invoice (diffing line items, updating invoice-level fields) instead of
  // creating a new one — same UI either way.
  initial?: InitialInvoiceData;
  // Mutually exclusive with `initial` — pre-fills a new invoice from another
  // one's data without switching the form into edit mode (see Clone above).
  cloneSeed?: CloneInvoiceSeed;
  // Called after a plain Save — the invoice (created on the very first Save
  // if it didn't exist yet) is still a draft, and the modal stays open.
  onDraftSaved?: () => void;
  // Called after Create / Update Invoice — the invoice is now published (or,
  // if it already was, just freshly updated). The parent closes the modal.
  onPublished?: (invoice: Invoice) => void;
  // Reported on every change so the parent's Exit button knows whether to
  // confirm before closing.
  onDirtyChange?: (isDirty: boolean) => void;
  // The Exit/Save/Create buttons live in the Modal's header (outside this
  // <form>, wired via `form={CREATE_INVOICE_FORM_ID}`), so submitting state
  // has to be reported back up to whoever renders them.
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

export function CreateInvoiceForm({ initial, cloneSeed, onDraftSaved, onPublished, onDirtyChange, onSubmittingChange }: Props) {
  const [company, setCompany] = useState<Company | null>(initial?.company ?? cloneSeed?.company ?? null);
  const [contact, setContact] = useState<Contact | null>(initial?.contact ?? cloneSeed?.contact ?? null);
  // Invoice date/payment term/due date are never seeded from cloneSeed — a
  // clone always starts from today with the normal create-mode net30 default,
  // same as if the user had picked everything by hand.
  const [invoiceDate, setInvoiceDate] = useState(initial ? toDateInput(initial.invoice.hsInvoiceDate) : todayInput());
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>(
    initial ? netDaysToTerm(initial.invoice.hsNetPaymentTerm) : 'net30',
  );
  const [dueDate, setDueDate] = useState(initial ? toDateInput(initial.invoice.hsDueDate) : addDays(todayInput(), 30));
  const [typeObj, setTypeObj] = useState<InvoiceType>((initial?.invoice.typeObj as InvoiceType) ?? cloneSeed?.typeObj ?? 'reseller');
  // Reseller-only "X / N" position — a clone never inherits it, since a
  // cloned invoice is a separate bill that needs its own position.
  const [installmentNumber, setInstallmentNumber] = useState(
    initial?.invoice.installmentNumber != null ? String(initial.invoice.installmentNumber) : '',
  );
  const [installmentTotal, setInstallmentTotal] = useState(
    initial?.invoice.installmentTotal != null ? String(initial.invoice.installmentTotal) : '',
  );
  const [rows, setRows] = useState<LineItemRow[]>(
    initial ? initial.lineItems.map(rowFromLineItem) : cloneSeed ? cloneSeed.lineItems.map(rowFromCloneLineItem) : [],
  );
  const [discountRows, setDiscountRows] = useState<DiscountRow[]>(
    initial ? initial.discounts.map(rowFromDiscount) : cloneSeed ? cloneSeed.discounts.map(rowFromCloneDiscount) : [],
  );
  // Never seeded from cloneSeed — a cloned invoice is a new, separate bill;
  // it shouldn't silently inherit someone else's applied credit.
  const [creditMemoRows, setCreditMemoRows] = useState<CreditMemoApplicationRow[]>(
    initial ? initial.creditMemoApplications.map(rowFromCreditMemoApplication) : [],
  );
  const [availableCreditMemos, setAvailableCreditMemos] = useState<AvailableCreditMemo[]>([]);
  const [error, setError] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // Tracks the invoice this session is persisting to — null until the very
  // first Save/Create, at which point it's created and every subsequent save
  // updates the same row instead of creating another one.
  const [persistedInvoiceId, setPersistedInvoiceId] = useState<string | null>(initial?.invoice.id ?? null);
  const [invoiceStatus, setInvoiceStatus] = useState(initial?.invoice.hsInvoiceStatus ?? 'draft');
  const [invoiceNumber, setInvoiceNumber] = useState(initial?.invoice.hsNumber ?? 'INV-DRAFT');
  const isDraftMode = (invoiceStatus ?? 'draft').toLowerCase() === 'draft';
  // What saveLineItemDiff/saveDiscountDiff diff the current rows against —
  // starts at whatever was loaded (or empty, for a brand-new invoice) and
  // moves forward to "whatever was last saved" after every successful save,
  // so a second/third Save in the same session diffs against the previous
  // save rather than the original mount data.
  const [baselineLineItems, setBaselineLineItems] = useState<LineItem[]>(initial?.lineItems ?? []);
  const [baselineDiscounts, setBaselineDiscounts] = useState<InvoiceDiscount[]>(initial?.discounts ?? []);
  const [baselineCreditMemoApplications, setBaselineCreditMemoApplications] = useState<CreditMemoApplication[]>(
    initial?.creditMemoApplications ?? [],
  );

  // Available credit memos for the currently-selected company — refetched
  // whenever the company changes, excluding this invoice's own existing
  // applications (once persisted) so re-adjusting them isn't blocked by
  // their own prior consumption of the memo's balance.
  useEffect(() => {
    if (!company) {
      setAvailableCreditMemos([]);
      return;
    }
    creditMemosApi
      .getAvailableForCompany(company.id, persistedInvoiceId ?? undefined)
      .then(setAvailableCreditMemos)
      .catch(() => setAvailableCreditMemos([]));
  }, [company, persistedInvoiceId]);

  // Takes rows/discountRows/creditMemoRows explicitly (rather than always
  // reading their state closures) so the post-save baseline can be computed
  // from the just-fetched arrays a save is about to set state with, instead
  // of the stale pre-refresh values a plain state read would still see
  // synchronously right after calling setRows.
  function buildSnapshot(currentRows: LineItemRow[], currentDiscountRows: DiscountRow[], currentCreditMemoRows: CreditMemoApplicationRow[]) {
    return JSON.stringify({
      companyId: company?.id ?? null,
      contactId: contact?.id ?? null,
      invoiceDate,
      paymentTerm,
      dueDate,
      typeObj,
      installmentNumber,
      installmentTotal,
      rows: currentRows,
      discountRows: currentDiscountRows,
      creditMemoRows: currentCreditMemoRows,
    });
  }
  const lastSavedSnapshotRef = useRef(buildSnapshot(rows, discountRows, creditMemoRows));
  const isDirty = buildSnapshot(rows, discountRows, creditMemoRows) !== lastSavedSnapshotRef.current;

  useEffect(() => {
    onDirtyChange?.(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  useEffect(() => {
    if (paymentTerm === 'custom') return;
    setDueDate(addDays(invoiceDate, NET_DAYS[paymentTerm]));
  }, [invoiceDate, paymentTerm]);

  function handleCompanyChange(next: Company | null) {
    setCompany(next);
    setContact(null);
    // Any picked credit memos belonged to the old company's own pool —
    // never valid for a different one.
    setCreditMemoRows([]);
  }

  function patchRow(key: string, patch: Partial<LineItemRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRowFromProduct(product: Product) {
    setRows((prev) => [...prev, rowFromProduct(product)]);
  }

  function cloneRow(key: string) {
    setRows((prev) => {
      const index = prev.findIndex((r) => r.key === key);
      if (index === -1) return prev;
      // A clone is always a new line item, never a stand-in for the row it
      // was copied from — drop `id` even though only rows with a productId
      // (never pre-existing rows) are cloneable in practice.
      const clone = { ...prev[index], key: crypto.randomUUID(), id: undefined };
      return [...prev.slice(0, index + 1), clone, ...prev.slice(index + 1)];
    });
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function moveRow(draggedKey: string, targetKey: string) {
    setRows((prev) => reorderByKey(prev, (r) => r.key, draggedKey, targetKey));
  }

  function addDiscountRow() {
    setDiscountRows((prev) => [...prev, newDiscountRow()]);
  }

  function patchDiscountRow(key: string, patch: Partial<DiscountRow>) {
    setDiscountRows((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function removeDiscountRow(key: string) {
    setDiscountRows((prev) => prev.filter((d) => d.key !== key));
  }

  // The first not-yet-used available memo — what a freshly-added row starts
  // out pointing at.
  function nextUnusedCreditMemo(currentRows: CreditMemoApplicationRow[]): AvailableCreditMemo | undefined {
    const usedIds = new Set(currentRows.map((r) => r.creditMemoId));
    return availableCreditMemos.find((cm) => !usedIds.has(cm.id));
  }

  function addCreditMemoRow() {
    setCreditMemoRows((prev) => {
      const next = nextUnusedCreditMemo(prev);
      return next ? [...prev, newCreditMemoApplicationRow(next.id)] : prev;
    });
  }

  function patchCreditMemoRow(key: string, patch: Partial<CreditMemoApplicationRow>) {
    setCreditMemoRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeCreditMemoRow(key: string) {
    setCreditMemoRows((prev) => prev.filter((r) => r.key !== key));
  }

  const editingRow = rows.find((r) => r.key === editingKey) ?? null;

  // Subtotal is pre-discount (unit price * quantity); total is what rowAmount
  // already nets out after each row's own discount - the gap between the two
  // is the aggregate line item discount shown in the summary below.
  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.unitPrice) || 0) * (Number(r.quantity) || 0), 0),
    [rows],
  );
  const total = useMemo(() => rows.reduce((sum, r) => sum + rowAmount(r), 0), [rows]);
  const discountTotal = subtotal - total;
  const globalDiscountTotal = useMemo(
    () => discountRows.reduce((sum, d) => sum + discountRowAmount(d, total), 0),
    [discountRows, total],
  );
  const grandTotal = Math.max(0, total - globalDiscountTotal);
  // Only an existing invoice can already have payments recorded against it -
  // a brand-new one hasn't been saved yet, so its balance due is just the total.
  const amountPaid = initial ? Number(initial.invoice.hsAmountPaid) || 0 : 0;
  const creditAppliedTotal = useMemo(
    () => creditMemoRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [creditMemoRows],
  );
  // Capped at 0 — an over-applied credit doesn't flip this invoice into
  // negative/"we owe them" territory, matching invoice.repository.ts's
  // recalculateAmountBilled exactly.
  const balanceDue = Math.max(0, grandTotal - amountPaid - creditAppliedTotal);

  // Tenants name is derived, not typed in — it's the deduplicated list of
  // whatever customer names are on the line items, in row order.
  const tenant = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const row of rows) {
      const name = row.customerName.trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
    return names.join(', ');
  }, [rows]);

  // Diffs the current rows against whatever was last saved (baselineLineItems
  // — the original invoice's line items on the first save of an existing
  // draft/invoice, or last session's save after that) and mutates only what
  // changed, through the same per-item endpoints the (now-removed) inline
  // line-item editor used. Never called before the invoice itself exists —
  // its first batch of line items is included inline in the create call.
  async function saveLineItemDiff(invoiceId: string) {
    if (!persistedInvoiceId) return;
    const currentIds = new Set(rows.filter((r) => r.id).map((r) => r.id!));
    for (const original of baselineLineItems) {
      if (!currentIds.has(original.id)) {
        await invoicesApi.deleteLineItem(invoiceId, original.id);
      }
    }
    const originalById = new Map(baselineLineItems.map((li) => [li.id, li]));
    for (const row of rows) {
      if (!row.id) {
        await invoicesApi.createLineItem(invoiceId, {
          productId: row.productId,
          quantity: Number(row.quantity) || 1,
          price: Number(row.unitPrice) || 0,
          ...discountCreatePayload(row),
          name: row.name,
          description: row.description,
          customerName: row.customerName,
        });
        continue;
      }
      const original = originalById.get(row.id);
      const changed =
        !original ||
        (original.quantity ?? '') !== row.quantity ||
        (original.price ?? '') !== row.unitPrice ||
        (original.discountType === 'amount' ? 'amount' : 'percentage') !== row.discountKind ||
        (original.hsDiscountPercentage ?? '') !== row.discountPct ||
        (original.discount ?? '') !== row.discountAmount ||
        (original.description ?? '') !== row.description ||
        (original.customerName ?? '') !== row.customerName;
      if (changed) {
        await invoicesApi.updateLineItem(invoiceId, row.id, {
          quantity: Number(row.quantity) || 1,
          price: Number(row.unitPrice) || 0,
          ...discountPayload(row),
          description: row.description,
          customerName: row.customerName,
        });
      }
    }
  }

  // Same diffing approach as saveLineItemDiff, for the invoice's global
  // discounts.
  async function saveDiscountDiff(invoiceId: string) {
    if (!persistedInvoiceId) return;
    const currentIds = new Set(discountRows.filter((d) => d.id).map((d) => d.id!));
    for (const original of baselineDiscounts) {
      if (!currentIds.has(original.id)) {
        await invoicesApi.deleteDiscount(invoiceId, original.id);
      }
    }
    const originalById = new Map(baselineDiscounts.map((d) => [d.id, d]));
    for (const row of discountRows) {
      const name = row.name.trim();
      const value = Number(row.value) || 0;
      if (!row.id) {
        await invoicesApi.createDiscount(invoiceId, { name, kind: row.kind, value });
        continue;
      }
      const original = originalById.get(row.id);
      const changed = !original || original.name !== name || original.kind !== row.kind || Number(original.value) !== value;
      if (changed) {
        await invoicesApi.updateDiscount(invoiceId, row.id, { name, kind: row.kind, value });
      }
    }
  }

  // Same diffing approach as saveDiscountDiff, for this invoice's applied
  // credit memos.
  async function saveCreditMemoApplicationDiff(invoiceId: string) {
    if (!persistedInvoiceId) return;
    const currentIds = new Set(creditMemoRows.filter((r) => r.id).map((r) => r.id!));
    for (const original of baselineCreditMemoApplications) {
      if (!currentIds.has(original.id)) {
        await invoicesApi.deleteCreditMemoApplication(invoiceId, original.id);
      }
    }
    const originalById = new Map(baselineCreditMemoApplications.map((a) => [a.id, a]));
    for (const row of creditMemoRows) {
      const amount = Number(row.amount) || 0;
      if (!row.id) {
        await invoicesApi.createCreditMemoApplication(invoiceId, { creditMemoId: row.creditMemoId, amount });
        continue;
      }
      const original = originalById.get(row.id);
      const changed = !original || Number(original.amount) !== amount;
      if (changed) {
        await invoicesApi.updateCreditMemoApplication(invoiceId, row.id, { amount });
      }
    }
  }

  // Distinguishes Save from Create/Update Invoice — both are `type="submit"
  // form={CREATE_INVOICE_FORM_ID}` buttons living in the parent's Modal
  // header (outside this <form>), so the standard way to tell which one
  // triggered a given submit is the native SubmitEvent's `submitter`.
  const [handleSubmit, isSubmitting] = useSubmitGuard(async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!company || !contact) {
      setError('Select a company and a billing contact.');
      return;
    }
    if (rows.length === 0) {
      setError('Add at least one line item.');
      return;
    }
    // Tenants name itself isn't user-entered — it's derived from each line
    // item's own customer name (see the `tenant` useMemo below) — so the
    // actual requirement lives on the line items, not that derived field.
    if (rows.some((r) => !r.customerName.trim())) {
      setError('Enter a customer name for each line item.');
      return;
    }
    if (discountRows.some((d) => !d.name.trim())) {
      setError('Enter a name for each discount.');
      return;
    }
    for (const row of creditMemoRows) {
      const amount = Number(row.amount) || 0;
      const memo = availableCreditMemos.find((cm) => cm.id === row.creditMemoId);
      // The row's own baseline amount (if it was already saved) counts back
      // toward the memo's available balance — only re-adjusting past what
      // was already applied should be blocked.
      const alreadyApplied = row.id ? Number(baselineCreditMemoApplications.find((a) => a.id === row.id)?.amount ?? 0) : 0;
      const cap = (memo ? Number(memo.availableBalance) : 0) + alreadyApplied;
      if (!memo || amount <= 0 || amount > cap) {
        setError("Enter a valid amount for each applied credit memo, no more than its available balance.");
        return;
      }
    }

    // Pressing Enter in a text field implicitly submits the form with no
    // identifiable submitter — default that ambiguous case to the safe,
    // non-finalizing action (Save) rather than Create/Update Invoice, so an
    // accidental Enter never publishes a draft the user only meant to save.
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent: 'save' | 'publish' = submitter?.value === 'publish' ? 'publish' : 'save';

    try {
      let targetId = persistedInvoiceId;
      const invoiceInput: Omit<CreateInvoiceInput, 'lineItems' | 'discounts' | 'creditMemoApplications'> = {
        companyId: company.id,
        contactId: contact.id,
        hsInvoiceDate: invoiceDate,
        hsDueDate: dueDate,
        hsNetPaymentTerm: paymentTerm === 'custom' ? undefined : NET_DAYS[paymentTerm],
        typeObj,
        tenant,
        hsCurrency: CURRENCY,
        installmentNumber: typeObj === 'reseller' && installmentNumber ? Number(installmentNumber) : undefined,
        installmentTotal: typeObj === 'reseller' && installmentTotal ? Number(installmentTotal) : undefined,
      };

      if (!targetId) {
        // First-ever persistence for this session (New or Clone) — line
        // items/discounts go inline in the create call; there's nothing to
        // diff yet.
        const lineItems = rows.map((r) => ({
          productId: r.productId,
          quantity: Number(r.quantity) || 1,
          price: Number(r.unitPrice) || 0,
          ...discountCreatePayload(r),
          name: r.name,
          description: r.description,
          customerName: r.customerName,
        }));
        const discounts = discountRows.map((d) => ({
          name: d.name.trim(),
          kind: d.kind,
          value: Number(d.value) || 0,
        }));
        const creditMemoApplications = creditMemoRows.map((r) => ({
          creditMemoId: r.creditMemoId,
          amount: Number(r.amount) || 0,
        }));
        const created = await invoicesApi.create({ ...invoiceInput, lineItems, discounts, creditMemoApplications });
        targetId = created.id;
        setPersistedInvoiceId(created.id);
        setInvoiceStatus(created.hsInvoiceStatus ?? 'draft');
        setInvoiceNumber(created.hsNumber ?? 'INV-DRAFT');
      } else {
        await invoicesApi.update(targetId, invoiceInput);
        await saveLineItemDiff(targetId);
        await saveDiscountDiff(targetId);
        await saveCreditMemoApplicationDiff(targetId);
      }

      // Re-derive rows/baseline from what's actually persisted, exactly like
      // Edit mode does on load — keeps every subsequent Save's diff correct
      // and resets the dirty-tracking snapshot to "nothing unsaved".
      const [freshLineItems, freshDiscounts, freshCreditMemoApplications] = await Promise.all([
        invoicesApi.getLineItems(targetId),
        invoicesApi.getDiscounts(targetId),
        invoicesApi.getCreditMemoApplications(targetId),
      ]);
      const freshRows = freshLineItems.map(rowFromLineItem);
      const freshDiscountRows = freshDiscounts.map(rowFromDiscount);
      const freshCreditMemoRows = freshCreditMemoApplications.map(rowFromCreditMemoApplication);
      setBaselineLineItems(freshLineItems);
      setBaselineDiscounts(freshDiscounts);
      setBaselineCreditMemoApplications(freshCreditMemoApplications);
      setRows(freshRows);
      setDiscountRows(freshDiscountRows);
      setCreditMemoRows(freshCreditMemoRows);
      lastSavedSnapshotRef.current = buildSnapshot(freshRows, freshDiscountRows, freshCreditMemoRows);

      if (intent === 'save') {
        onDraftSaved?.();
        return;
      }

      const finalInvoice = isDraftMode ? await invoicesApi.publish(targetId) : await invoicesApi.getById(targetId);
      onPublished?.(finalInvoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isDraftMode ? 'create' : 'update'} invoice`);
    }
  });

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

  const columns: Column<LineItemRow>[] = [
    dragHandleColumn<LineItemRow>((row) => row.key),
    {
      key: 'name',
      header: 'Product name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{row.name}</span>
          <span className={styles['row-actions-cell']}>
            <RowActionsMenu
              actions={[
                { label: 'Edit', icon: Pencil, onClick: () => setEditingKey(row.key) },
                {
                  label: 'Clone',
                  icon: Copy,
                  onClick: () => cloneRow(row.key),
                  disabled: !row.productId,
                  title: !row.productId ? "This line item isn't tied to a product, so it can't be cloned" : undefined,
                },
                { label: 'Delete', icon: Trash2, onClick: () => removeRow(row.key), variant: 'danger' },
              ]}
            />
          </span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => <TruncatedText text={row.description} max={60} />,
    },
    {
      key: 'customerName',
      header: 'Customer name *',
      render: (row) => (
        <input
          type="text"
          className={styles['table-input']}
          value={row.customerName}
          onChange={(e) => patchRow(row.key, { customerName: e.target.value })}
          placeholder="e.g. end customer"
          style={{ width: 140 }}
        />
      ),
    },
    {
      key: 'unitPrice',
      header: 'Unit price',
      render: (row) => (
        <CurrencyMaskedInput
          className={styles['table-input']}
          value={row.unitPrice}
          onChange={(v) => patchRow(row.key, { unitPrice: v })}
          style={{ width: 115 }}
        />
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (row) => (
        <input
          type="number"
          step="1"
          min="1"
          className={styles['table-input']}
          value={row.quantity}
          onChange={(e) => patchRow(row.key, { quantity: e.target.value })}
          onBlur={() => patchRow(row.key, { quantity: roundToInteger(row.quantity) })}
          style={{ width: 70 }}
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
            onChange={(value) => patchRow(row.key, { discountKind: value })}
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
              onChange={(e) => patchRow(row.key, { discountPct: e.target.value })}
              onBlur={() => patchRow(row.key, { discountPct: roundToDecimals(row.discountPct, 2) })}
            />
          ) : (
            <CurrencyMaskedInput
              className={styles['line-item-discount-input']}
              value={row.discountAmount}
              onChange={(v) => patchRow(row.key, { discountAmount: v })}
            />
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(rowAmount(row), CURRENCY)}</span>
      ),
    },
  ];

  return (
    <>
      <form id={CREATE_INVOICE_FORM_ID} onSubmit={handleSubmit} className={`form ${styles['fullscreen-form']}`}>
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label>Company *</label>
              <CompanySearchSelect value={company} onChange={handleCompanyChange} />
            </div>
            <div className="form-group">
              <label>Billing contact *</label>
              {company ? (
                <ContactSearchSelect value={contact} onChange={setContact} companyId={company.id} />
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select a company first</div>
              )}
            </div>
            {company && companyAddressLines(company).length > 0 && (
              <div className="form-group">
                <label>Company address</label>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>
                  {companyAddressLines(company).map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Invoice date *</label>
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Payment terms *</label>
                <Select value={paymentTerm} onChange={setPaymentTerm} options={PAYMENT_TERM_OPTIONS} ariaLabel="Payment terms" />
              </div>
              <div className="form-group">
                <label>Due date *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={paymentTerm !== 'custom'}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Invoice number</label>
                <input value={invoiceNumber} disabled />
              </div>
              <div className="form-group">
                <label>Type *</label>
                <Select value={typeObj} onChange={setTypeObj} options={TYPE_OPTIONS} ariaLabel="Type" />
              </div>
              {typeObj === 'msp' && (
                <div className="form-group">
                  <label>MSP Level</label>
                  <input value={company?.partnerMspLevel ?? '—'} disabled />
                </div>
              )}
            </div>

            {typeObj === 'reseller' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Installment #</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="e.g. 1"
                    value={installmentNumber}
                    onChange={(e) => setInstallmentNumber(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Total installments</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="e.g. 12"
                    value={installmentTotal}
                    onChange={(e) => setInstallmentTotal(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Tenants name</label>
              <input value={tenant || '—'} disabled />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Line items</h3>
            <span className={styles['add-line-item']}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowProductPicker(true)}>
                + Add line item
              </Button>
            </span>
          </div>
          {rows.length === 0 ? (
            <div className={styles['line-items-table']}>
              <div className={styles['line-items-empty']}>
                <h4 className={styles['line-items-empty-title']}>Add line items to your invoice</h4>
                <p className={styles['line-items-empty-description']}>
                  Add line items for the products you're selling to your customer.
                </p>
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
                keyExtractor={(r) => r.key}
                emptyMessage="No line items yet."
                onReorder={moveRow}
                maxVisibleRows={10}
              />
            </div>
          )}
        </div>

        <div className={styles['summary-card']}>
          <div className={styles['summary-title']}>Summary</div>

          <div className={styles['summary-row']}>
            <span className={styles['summary-label']}>Subtotal</span>
            <span className={styles['summary-dots']} />
            <span className={styles['summary-value']}>{formatCurrency(subtotal, CURRENCY)}</span>
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

          {discountRows.map((row) => (
            <div key={row.key} className={`${styles['summary-row']} ${styles['summary-row--nested']} ${styles['discount-row']}`}>
              <div className={styles['discount-name-block']}>
                <label className={styles['discount-name-static-label']}>One-time discount *</label>
                <input
                  type="text"
                  className={styles['discount-name-input']}
                  value={row.name}
                  onChange={(e) => patchDiscountRow(row.key, { name: e.target.value })}
                  placeholder="Enter a discount name"
                />
              </div>
              <div className={styles['discount-right']}>
                <div className={styles['discount-value-group']}>
                  <Select
                    value={row.kind}
                    onChange={(value) => patchDiscountRow(row.key, { kind: value })}
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
                      onChange={(e) => patchDiscountRow(row.key, { value: e.target.value })}
                      onBlur={() => patchDiscountRow(row.key, { value: roundToDecimals(row.value, 2) })}
                    />
                  ) : (
                    <CurrencyMaskedInput
                      className={styles['discount-value-input']}
                      value={row.value}
                      onChange={(v) => patchDiscountRow(row.key, { value: v })}
                    />
                  )}
                </div>
                <button
                  type="button"
                  className={styles['discount-remove-btn']}
                  onClick={() => removeDiscountRow(row.key)}
                  aria-label="Remove discount"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <span className={`${styles['summary-value']} ${styles['summary-value--accent']} ${styles['discount-amount']}`}>
                −{formatCurrency(discountRowAmount(row, total), CURRENCY)}
              </span>
            </div>
          ))}

          <div className={`${styles['summary-row']} ${styles['summary-row--nested']}`}>
            <button type="button" className={styles['add-discount-link']} onClick={addDiscountRow}>
              + Add discount
            </button>
          </div>

          <div className={`${styles['summary-row']} ${styles['summary-row--bold']}`}>
            <span className={styles['summary-label']}>Total</span>
            <span className={styles['summary-dots']} />
            <span className={styles['summary-value']}>{formatCurrency(grandTotal, CURRENCY)}</span>
          </div>

          {/* Only shown when the selected company actually has credit memos
              with balance left — otherwise nothing about this card changes. */}
          {availableCreditMemos.length > 0 && (
            <>
              {creditMemoRows.map((row) => {
                const usedElsewhere = new Set(
                  creditMemoRows.filter((r) => r.key !== row.key).map((r) => r.creditMemoId),
                );
                const options: SelectOption<string>[] = availableCreditMemos
                  .filter((cm) => cm.id === row.creditMemoId || !usedElsewhere.has(cm.id))
                  .map((cm) => ({ value: cm.id, label: creditMemoLabel(cm) }));
                return (
                  <div key={row.key} className={`${styles['summary-row']} ${styles['summary-row--nested']} ${styles['discount-row']}`}>
                    <div className={styles['discount-name-block']}>
                      <label className={styles['discount-name-static-label']}>Credit memo *</label>
                      <Select
                        value={row.creditMemoId}
                        onChange={(value) => patchCreditMemoRow(row.key, { creditMemoId: value })}
                        options={options}
                        ariaLabel="Credit memo"
                      />
                    </div>
                    <div className={styles['discount-right']}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <label className={styles['discount-name-static-label']}>Amount applied *</label>
                        <div className={styles['discount-value-group']}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={styles['discount-value-input']}
                            value={row.amount}
                            onChange={(e) => patchCreditMemoRow(row.key, { amount: e.target.value })}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles['discount-remove-btn']}
                        onClick={() => removeCreditMemoRow(row.key)}
                        aria-label="Remove credit memo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <span className={`${styles['summary-value']} ${styles['summary-value--accent']} ${styles['discount-amount']}`}>
                      −{formatCurrency(Number(row.amount) || 0, CURRENCY)}
                    </span>
                  </div>
                );
              })}

              {nextUnusedCreditMemo(creditMemoRows) && (
                <div className={`${styles['summary-row']} ${styles['summary-row--nested']}`}>
                  <button type="button" className={styles['add-discount-link']} onClick={addCreditMemoRow}>
                    + Apply credit memo
                  </button>
                </div>
              )}
            </>
          )}

          <div className={`${styles['summary-row']} ${styles['summary-row--bold']}`}>
            <span className={styles['summary-label']}>Balance due</span>
            <span className={styles['summary-dots']} />
            <span className={styles['summary-value']}>{formatCurrency(balanceDue, CURRENCY)}</span>
          </div>
        </div>
      </form>

      {showProductPicker && (
        <ProductPickerModal onPick={addRowFromProduct} onClose={() => setShowProductPicker(false)} />
      )}

      {editingRow && (
        <EditLineItemRowModal
          initial={editingRow as EditableLineItemFields}
          onSave={(patch) => patchRow(editingRow.key, patch)}
          onClose={() => setEditingKey(null)}
        />
      )}
    </>
  );
}

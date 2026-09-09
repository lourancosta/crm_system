// Field names mirror the raw hs_* columns (matches Payment's convention in
// shared/types/index.ts, and the already-defined-but-unused AssociatedQuote
// type there) — only the joined/derived fields (ownerName, companyId,
// companyName) get clean names, same as payment.repository.ts's companyName.
export type Quote = {
  id: string;
  hubspotId: string;
  archived: boolean;
  hsTitle: string | null;
  hsQuoteNumber: string | null;
  hsQuoteStatus: string | null;
  hsQuoteAmount: string | null;
  hsTcv: string | null;
  hsCurrency: string | null;
  hsDealName: string | null;
  hsExpirationDate: Date | null;
  hsLastPublishedDate: Date | null;
  isSigned: boolean;
  hsSignedDate: Date | null;
  hubspotOwnerId: string | null;
  ownerName: string | null;
  companyId: string | null;
  companyName: string | null;
  hsSenderFirstname: string | null;
  hsSenderLastname: string | null;
  hsSenderJobtitle: string | null;
  hsSenderEmail: string | null;
  hsSenderPhone: string | null;
  hsSenderCompanyName: string | null;
  hsSenderAvatarUrl: string | null;
  hsComments: string | null;
  hsTerms: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AssociatedCompany = {
  id: string;
  name: string | null;
  domain: string | null;
  website: string | null;
};

export type AssociatedDeal = {
  id: string;
  dealname: string | null;
  amount: string | null;
  closedate: Date | null;
};

export type AssociatedContact = {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
  jobtitle: string | null;
  company: string | null;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

// Quote-only concept (not shared with invoice.types.ts's LineItem) — how a
// license line item's billing period actually begins. Free-form text at the
// DB/repository layer (line_items is a shared HubSpot-mirrored table with a
// real hs_billing_start_delay_type property), but the quote module only ever
// writes one of these four values.
export const BILLING_START_TYPES = ['at_payment', 'custom_date', 'delayed_days', 'delayed_months'] as const;
export type BillingStartType = (typeof BILLING_START_TYPES)[number];

// Quote-only too — line_items.recurringbillingfrequency is a free-form
// HubSpot-mirrored column (real synced products/invoices can carry other
// values like 'per_six_months'), but a quote line item only ever writes one
// of these four; 'monthly' is the quote-specific default (every product's
// price is a per-month amount, regardless of the originating product's own
// frequency).
export const BILLING_FREQUENCIES = ['one_time', 'monthly', 'quarterly', 'annually'] as const;
export type BillingFrequency = (typeof BILLING_FREQUENCIES)[number];

// A line item's own unit discount can be a % (hsDiscountPercentage) or a flat
// per-unit $ amount (discount) — mirrors quote_discounts'/invoice_discounts'
// own 'percentage' | 'amount' kind, just scoped to one line item.
export const LINE_ITEM_DISCOUNT_KINDS = ['percentage', 'amount'] as const;
export type LineItemDiscountKind = (typeof LINE_ITEM_DISCOUNT_KINDS)[number];

// Mirrors invoice.types.ts's LineItem plus quote-only billing start/term
// fields — same underlying dynamic.line_items table, just associated to a
// quote instead of an invoice.
export type LineItem = {
  id: string;
  name: string | null;
  description: string | null;
  quantity: string | null;
  price: string | null;
  amount: string | null;
  module: string | null;
  groupLicense: string | null;
  customerName: string | null;
  recurringbillingfrequency: string | null;
  hsLineItemCurrencyCode: string | null;
  hsDiscountPercentage: string | null;
  discount: string | null;
  discountType: string | null;
  hsEffectiveUnitPrice: string | null;
  hsPositionOnQuote: string | null;
  hsBillingStartDelayType: string | null;
  hsBillingStartDelayDays: string | null;
  hsBillingStartDelayMonths: string | null;
  // Plain "YYYY-MM-DD" string — the underlying column is a date-mode-string
  // drizzle column (unlike the timestamp-mode hs*Date columns elsewhere in
  // this module), matching what an <input type="date"> sends/expects.
  hsRecurringBillingStartDate: string | null;
  hsTermInMonths: string | null;
};

export type CreateLineItemInput = {
  productId: string;
  quantity: number;
  price?: number;
  hsDiscountPercentage?: number;
  discount?: number;
  discountType?: LineItemDiscountKind;
  name?: string;
  description?: string;
  customerName?: string;
  hsBillingStartDelayType?: BillingStartType;
  hsBillingStartDelayDays?: number;
  hsBillingStartDelayMonths?: number;
  hsRecurringBillingStartDate?: string;
  hsTermInMonths?: number;
  recurringbillingfrequency?: BillingFrequency;
};

export type UpdateLineItemInput = {
  quantity?: number;
  price?: number;
  // null explicitly clears whichever of these two isn't the active
  // discountType, the same "clear the now-irrelevant one" pattern as the
  // billing-start fields below.
  hsDiscountPercentage?: number | null;
  discount?: number | null;
  discountType?: LineItemDiscountKind;
  description?: string;
  customerName?: string;
  hsBillingStartDelayType?: BillingStartType;
  // null (not just omitted) explicitly clears the value — needed when the
  // billing start type changes away from the one that used it.
  hsBillingStartDelayDays?: number | null;
  hsBillingStartDelayMonths?: number | null;
  hsRecurringBillingStartDate?: string | null;
  hsTermInMonths?: number;
  recurringbillingfrequency?: BillingFrequency;
};

export type QuoteDiscountKind = 'percentage' | 'amount';

export type QuoteDiscount = {
  id: string;
  quoteId: string;
  name: string;
  kind: QuoteDiscountKind;
  value: string;
  sortOrder: number;
};

export type CreateQuoteDiscountInput = {
  name: string;
  kind: QuoteDiscountKind;
  value: number;
};

export type UpdateQuoteDiscountInput = Partial<CreateQuoteDiscountInput>;

export type QuoteSignerType = 'contact' | 'internal';

export type QuoteSigner = {
  id: string;
  quoteId: string;
  signerType: QuoteSignerType;
  contactId: string | null;
  userId: string | null;
  method: string;
  signerName: string;
  signerEmail: string | null;
  tokenExpiresAt: Date | null;
  signatureImage: string | null;
  sortOrder: number;
  signedAt: Date | null;
};

// Snapshot of a buyer contact selected in the wizard's Signature step — name/
// email are captured at that point rather than joined live, same reasoning
// as every other quote sub-entity that snapshots HubSpot-sourced data.
export type ContactSignerSnapshot = {
  contactId: string;
  signerName: string;
  signerEmail: string | null;
};

export type SubmitSignatureInput = {
  signatureImage: string;
  ipAddress?: string;
  userAgent?: string;
};

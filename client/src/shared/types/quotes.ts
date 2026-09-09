import type { InvoiceDiscountKind } from './invoices';

// Quote line item Line Items step's "Billing start date" column — how a
// license's billing period begins. Persisted on LineItem.hsBillingStartDelayType.
export const BILLING_START_TYPES = ['at_payment', 'custom_date', 'delayed_days', 'delayed_months'] as const;
export type BillingStartType = (typeof BILLING_START_TYPES)[number];

// Line Items step's "Billing frequency" column. Persisted on
// LineItem.recurringbillingfrequency; 'monthly' is the quote default (every
// product's price is a per-month amount).
export const BILLING_FREQUENCIES = ['one_time', 'monthly', 'quarterly', 'annually'] as const;
export type BillingFrequency = (typeof BILLING_FREQUENCIES)[number];

export type AssociatedQuote = {
  id: string;
  hsTitle: string | null;
  hsQuoteNumber: string | null;
  hsQuoteStatus: string | null;
  hsQuoteAmount: string | null;
  hsCurrency: string | null;
  hsExpirationDate: string | null;
  isSigned: boolean;
  hsSignedDate: string | null;
};

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
  hsExpirationDate: string | null;
  hsLastPublishedDate: string | null;
  isSigned: boolean;
  hsSignedDate: string | null;
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
  createdAt: string;
  updatedAt: string;
};

// Mirrors InvoiceDiscount exactly — same 'percentage' | 'amount' one-time
// discount concept, just scoped to a quote instead of an invoice.
export type QuoteDiscountKind = InvoiceDiscountKind;

export type QuoteDiscount = {
  id: string;
  quoteId: string;
  name: string;
  kind: InvoiceDiscountKind;
  value: string;
  sortOrder: number;
};

export type CreateQuoteDiscountInput = {
  name: string;
  kind: InvoiceDiscountKind;
  value: number;
};

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
  tokenExpiresAt: string | null;
  signatureImage: string | null;
  sortOrder: number;
  signedAt: string | null;
};

// Sanitized shape from the public (unauthenticated) signer list endpoint —
// never exposes email/token, just enough to show who's still pending.
export type PublicQuoteSignerStatus = {
  id: string;
  signerType: QuoteSignerType;
  signerName: string;
  signed: boolean;
};

// What a signer's own token resolves to on the public preview page.
export type PublicSignerInfo = {
  signerName: string;
  signed: boolean;
  signedAt: string | null;
};

export type UpdateQuoteDiscountInput = Partial<CreateQuoteDiscountInput>;

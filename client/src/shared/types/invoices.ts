export type Invoice = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  hsNumber: string | null;
  hsInvoiceStatus: string | null;
  tenant: string | null;
  hsDueDate: string | null;
  hsAmountPaid: string | null;
  hsAmountBilled: string | null;
  hsBalanceDue: string | null;
  hsCurrency: string | null;
  hsBillingFrequencyType: string | null;
  mspLevel: string | null;
  typeObj: string | null;
  hsNetPaymentTerm: string | null;
  hsInvoiceDate: string | null;
  hsInvoiceLatestCompanyName: string | null;
  hsInvoiceLatestContactEmail: string | null;
  hsInvoiceLatestContactFirstname: string | null;
  hsInvoiceLatestContactLastname: string | null;
  hsRecipientCompanyAddress: string | null;
  hsRecipientCompanyCity: string | null;
  hsRecipientCompanyState: string | null;
  hsRecipientCompanyCountry: string | null;
  hsRecipientCompanyZip: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  createdAt: string;
  updatedAt: string;
  creditMemoTotal?: number;
  adjustedBalanceDue?: string;
};

// Shared with quotes — same underlying dynamic.line_items table, just
// associated to whichever parent (invoice or quote) it belongs to.
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
  // Which of these two is active — 'percentage' (hsDiscountPercentage) or
  // 'amount' (discount, a flat per-unit $ deduction). Null on legacy rows
  // defaults to 'percentage' in application code (that was the only option
  // before line items could use a flat amount).
  discount: string | null;
  discountType: string | null;
  hsEffectiveUnitPrice: string | null;
  hsPositionOnQuote: string | null;
  // Quote-only (billing start/term step) — invoices never read or write
  // these, but they live on the same shared line_items row.
  hsBillingStartDelayType: string | null;
  hsBillingStartDelayDays: string | null;
  hsBillingStartDelayMonths: string | null;
  hsRecurringBillingStartDate: string | null;
  hsTermInMonths: string | null;
};

export type CreateLineItemInput = {
  productId: string;
  quantity?: number;
  price?: number;
  hsDiscountPercentage?: number;
  discount?: number;
  discountType?: InvoiceDiscountKind;
  name?: string;
  description?: string;
  customerName?: string;
  hsBillingStartDelayType?: string;
  hsBillingStartDelayDays?: number;
  hsBillingStartDelayMonths?: number;
  hsRecurringBillingStartDate?: string;
  hsTermInMonths?: number;
  recurringbillingfrequency?: string;
};

export type UpdateLineItemInput = {
  quantity?: number;
  price?: number;
  // null explicitly clears whichever of these two isn't the active
  // discountType — undefined just omits the field.
  hsDiscountPercentage?: number | null;
  discount?: number | null;
  discountType?: InvoiceDiscountKind;
  description?: string;
  customerName?: string;
  hsBillingStartDelayType?: string;
  // null explicitly clears the value (e.g. billing start type changed away
  // from the one that used it) — undefined just omits the field.
  hsBillingStartDelayDays?: number | null;
  hsBillingStartDelayMonths?: number | null;
  hsRecurringBillingStartDate?: string | null;
  hsTermInMonths?: number;
  recurringbillingfrequency?: string;
};

export type InvoiceDiscountKind = 'percentage' | 'amount';

export type InvoiceDiscount = {
  id: string;
  invoiceId: string;
  name: string;
  kind: InvoiceDiscountKind;
  value: string;
  sortOrder: number;
};

export type CreateInvoiceDiscountInput = {
  name: string;
  kind: InvoiceDiscountKind;
  value: number;
};

export type UpdateInvoiceDiscountInput = Partial<CreateInvoiceDiscountInput>;

// A credit memo's balance applied toward this invoice's balance due — a memo
// is a reusable pool, so it can have applications on many different invoices.
export type CreditMemoApplication = {
  id: string;
  invoiceId: string;
  creditMemoId: string;
  amount: string;
};

export type CreateCreditMemoApplicationInput = {
  creditMemoId: string;
  amount: number;
};

export type UpdateCreditMemoApplicationInput = {
  amount: number;
};

export type CreateInvoiceInput = {
  companyId: string;
  contactId: string;
  hsInvoiceDate: string;
  hsDueDate: string;
  hsNetPaymentTerm?: number;
  typeObj: 'reseller' | 'msp';
  tenant?: string;
  hsCurrency: string;
  installmentNumber?: number;
  installmentTotal?: number;
  lineItems: CreateLineItemInput[];
  discounts?: CreateInvoiceDiscountInput[];
  creditMemoApplications?: CreateCreditMemoApplicationInput[];
};

// Same invoice-level fields as CreateInvoiceInput — the edit modal reuses the
// create form — but line items and discounts aren't included: they're
// mutated separately via their own per-item endpoints, diffed against the
// invoice's existing line items/discounts.
export type UpdateInvoiceDetailsInput = Omit<CreateInvoiceInput, 'lineItems' | 'discounts' | 'creditMemoApplications'>;

export type InvoiceClonePreview = {
  companyId: string | null;
  contactId: string | null;
  typeObj: 'reseller' | 'msp' | null;
  lineItems: {
    productId: string;
    name: string;
    description: string;
    customerName: string;
    price: number;
    quantity: number;
    hsDiscountPercentage: number;
    discount: number;
    discountType: InvoiceDiscountKind;
  }[];
  discounts: CreateInvoiceDiscountInput[];
  notes: string[];
};

export type AssociatedInvoice = {
  id: string;
  hsNumber: string | null;
  hsInvoiceStatus: string | null;
  hsBalanceDue: string | null;
  hsCurrency: string | null;
  hsDueDate: string | null;
};

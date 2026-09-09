export type Invoice = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  hsNumber: string | null;
  hsInvoiceStatus: string | null;
  tenant: string | null;
  hsDueDate: Date | null;
  hsInvoiceDate: Date | null;
  hsAmountPaid: string | null;
  hsAmountBilled: string | null;
  hsBalanceDue: string | null;
  hsCurrency: string | null;
  hsBillingFrequencyType: string | null;
  mspLevel: string | null;
  typeObj: string | null;
  hsNetPaymentTerm: string | null;
  hsInvoiceLatestCompanyName: string | null;
  hsInvoiceLatestContactEmail: string | null;
  hsInvoiceLatestContactFirstname: string | null;
  hsInvoiceLatestContactLastname: string | null;
  hsRecipientCompanyAddress: string | null;
  hsRecipientCompanyCity: string | null;
  hsRecipientCompanyState: string | null;
  hsRecipientCompanyCountry: string | null;
  hsRecipientCompanyZip: string | null;
  // Reseller-only "X / N" position within its deal's invoices, sorted by due
  // date oldest→newest — null for MSP invoices and for reseller invoices not
  // yet associated with a deal.
  installmentNumber: number | null;
  installmentTotal: number | null;
  createdAt: Date;
  updatedAt: Date;
};

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
};

export type UpdateInvoiceInput = {
  hsNumber?: string;
  hsInvoiceStatus?: string;
  tenant?: string;
  hsDueDate?: Date;
  hsInvoiceDate?: Date;
  hsBillingFrequencyType?: string;
  hsCurrency?: string;
};

export type CreateLineItemInput = {
  productId: string;
  quantity: number;
  price?: number;
  hsDiscountPercentage?: number;
  discount?: number;
  discountType?: InvoiceDiscountKind;
  name?: string;
  description?: string;
  customerName?: string;
};

export type CreateInvoiceInput = {
  companyId: string;
  contactId: string;
  hsInvoiceDate: Date;
  hsDueDate: Date;
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

// Same invoice-level fields as CreateInvoiceInput — the edit modal reuses
// the create form wholesale — but line items and discounts are mutated
// separately through their own per-item endpoints (many pre-existing/
// HubSpot-synced line items have no resolvable productId, so they can't
// round-trip through a productId-keyed bulk replace).
export type UpdateInvoiceDetailsInput = Omit<CreateInvoiceInput, 'lineItems' | 'discounts'>;

export type UpdateLineItemInput = {
  quantity?: number;
  price?: number;
  // null explicitly clears whichever of these two isn't the active
  // discountType.
  hsDiscountPercentage?: number | null;
  discount?: number | null;
  discountType?: InvoiceDiscountKind;
  description?: string;
  customerName?: string;
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

// A credit memo's balance applied toward this invoice's balance due — see
// credit_memo_applications (public schema, not HubSpot-mirrored). A memo is
// a reusable pool, so it can have applications on many different invoices.
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

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

// Read-only "what would a clone of this invoice look like" preview — nothing
// is persisted here. The frontend uses it to pre-fill the same create-invoice
// form the user would fill out by hand, which is what actually creates the
// new invoice on submit (via the normal POST /invoices).
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
  // Human-readable notes about anything that couldn't be carried over
  // (archived company/contact, a line item whose product no longer exists).
  notes: string[];
};

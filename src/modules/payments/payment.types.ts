export type PaymentRecord = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  hsPaymentId: string | null;
  hsInitialAmount: string | null;
  hsNetAmount: string | null;
  hsFeesAmount: string | null;
  hsCurrencyCode: string | null;
  hsLatestStatus: string | null;
  hsPaymentMethodType: string | null;
  hsPaymentType: string | null;
  hsProcessorType: string | null;
  hsCustomerEmail: string | null;
  hsReferenceNumber: string | null;
  hsInternalComment: string | null;
  hsInitiatedDate: Date | null;
  hsCreatedate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  companyName: string | null;
};

export type AssociatedInvoice = {
  id: string;
  hsNumber: string | null;
  hsInvoiceStatus: string | null;
  hsBalanceDue: string | null;
  hsCurrency: string | null;
  hsDueDate: Date | null;
};

export type AssociatedCompany = {
  id: string;
  name: string | null;
  domain: string | null;
  website: string | null;
};

export const PAYMENT_METHODS = ['wire_transfer', 'ach', 'card', 'cash', 'check', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type CreatePaymentInput = {
  invoiceId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  internalNote?: string;
};

// invoiceId is deliberately excluded — reassigning a payment to a different
// invoice after the fact isn't supported.
export type UpdatePaymentInput = {
  amount?: string;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  internalNote?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

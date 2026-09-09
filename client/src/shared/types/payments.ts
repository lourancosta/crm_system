export type AssociatedPayment = {
  id: string;
  hsPaymentId: string | null;
  hsInitialAmount: string | null;
  hsNetAmount: string | null;
  hsCurrencyCode: string | null;
  hsLatestStatus: string | null;
  hsPaymentMethodType: string | null;
  hsInitiatedDate: string | null;
};

export type Payment = {
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
  hsInitiatedDate: string | null;
  hsCreatedate: string | null;
  createdAt: string;
  updatedAt: string;
  companyName: string | null;
};

export const PAYMENT_METHODS = ['wire_transfer', 'ach', 'card', 'cash', 'check', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wire_transfer: 'Wire Transfer',
  ach: 'ACH',
  card: 'Card',
  cash: 'Cash',
  check: 'Check',
  other: 'Other',
};

export type CreatePaymentInput = {
  invoiceId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  internalNote?: string;
};

export type UpdatePaymentInput = {
  amount?: string;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  internalNote?: string;
};

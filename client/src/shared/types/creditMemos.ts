export type CreditMemo = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  hsNumber: string | null;
  hsCreditMemoStatus: string | null;
  hsCreditMemoDate: string | null;
  hsCreditMemoSource: string | null;
  hsAmountCredited: string | null;
  hsAmountRemaining: string | null;
  hsCurrency: string | null;
  hsComments: string | null;
  hsSubtotal: string | null;
  hsDiscountsTotal: string | null;
  hsFeesTotal: string | null;
  hsTaxesTotal: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed live server-side from credit_memo_applications, never stored.
  appliedAmount: string;
  openAmount: string;
  // Only populated by the list endpoint (the list page's Company column).
  companyId?: string | null;
  companyName?: string | null;
};

export type AssociatedCreditMemo = {
  id: string;
  hsNumber: string | null;
  hsCreditMemoStatus: string | null;
  hsAmountCredited: string | null;
  hsCurrency: string | null;
  hsCreditMemoDate: string | null;
  hsComments: string | null;
};

// A company's credit memos that still have balance left — availableBalance
// is computed live server-side, never stored.
export type AvailableCreditMemo = {
  id: string;
  hsNumber: string | null;
  hsAmountCredited: string | null;
  hsCurrency: string | null;
  availableBalance: string;
};

export type CreateCreditMemoInput = {
  invoiceId?: string;
  amount: string;
  reason?: string;
  companyId?: string;
  contactId?: string;
};

export type UpdateCreditMemoInput = {
  amount?: string;
  reason?: string;
};

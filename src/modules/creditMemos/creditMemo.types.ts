export type CreditMemo = {
  id: string;
  hubspotId: string | null;
  archived: boolean;
  hsNumber: string | null;
  hsCreditMemoStatus: string | null;
  hsCreditMemoDate: Date | null;
  hsCreditMemoSource: string | null;
  hsAmountCredited: string | null;
  hsAmountRemaining: string | null;
  hsCurrency: string | null;
  hsComments: string | null;
  hsSubtotal: string | null;
  hsDiscountsTotal: string | null;
  hsFeesTotal: string | null;
  hsTaxesTotal: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Computed live from credit_memo_applications, never stored (hs_amount_
  // remaining is a dead HubSpot column, never written) — appliedAmount is the
  // sum of every application of this memo across every invoice; openAmount
  // is hsAmountCredited minus that.
  appliedAmount: string;
  openAmount: string;
  // Only populated on findAll (the list page's own Company column) — mirrors
  // payment.repository.ts's companyName pattern, plus the id so the list
  // page can link straight to the company record. Not selected on findById
  // since the detail page already has its own Companies association panel.
  companyId?: string | null;
  companyName?: string | null;
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

export type AssociatedContact = {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  jobtitle: string | null;
  company: string | null;
};

// A company's credit memos that still have balance left to apply toward an
// invoice — availableBalance is computed live (hsAmountCredited minus every
// existing credit_memo_applications row for that memo), never stored.
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

// Status/date/currency are server-set on create (not user input there
// either) and company/contact associations aren't reassignable — only the
// credited amount and reason are editable.
export type UpdateCreditMemoInput = {
  amount?: string;
  reason?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

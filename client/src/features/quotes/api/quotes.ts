import { del, get, post, put } from '../../../shared/api/client';
import type {
  AssociatedCompany,
  AssociatedContact,
  AssociatedDeal,
  CreateLineItemInput,
  CreateQuoteDiscountInput,
  LineItem,
  Quote,
  QuoteDiscount,
  QuoteSigner,
  UpdateLineItemInput,
  UpdateQuoteDiscountInput,
} from '../../../shared/types/index';

export type PaginatedQuotes = { data: Quote[]; total: number; page: number; limit: number };

export type UpdateQuoteSenderInput = {
  firstname?: string;
  lastname?: string;
  jobtitle?: string;
  email?: string;
  phone?: string;
  companyName?: string;
};

export type UpdateQuoteDetailsInput = {
  name?: string;
  expirationDate?: string;
  commentsToBuyer?: string;
  purchaseTerms?: string;
};

export const quotesApi = {
  list: (page = 1, limit = 50, search = '', status = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return get<PaginatedQuotes>(`/quotes?${params}`);
  },
  getById: (id: string) => get<Quote>(`/quotes/${id}`),
  getCompanies: (id: string) => get<AssociatedCompany[]>(`/quotes/${id}/companies`),
  getDeals: (id: string) => get<AssociatedDeal[]>(`/quotes/${id}/deals`),
  getContacts: (id: string) => get<AssociatedContact[]>(`/quotes/${id}/contacts`),
  getSigners: (id: string) => get<QuoteSigner[]>(`/quotes/${id}/signers`),
  updateSigners: (id: string, contactIds: string[], signerUserId: string | null) =>
    put<QuoteSigner[]>(`/quotes/${id}/signers`, { contactIds, signerUserId }),
  resendSignerLink: (id: string, signerId: string) =>
    post<{ message: string }>(`/quotes/${id}/signers/${signerId}/resend`, {}),
  countersign: (id: string, signatureImage: string) => post<QuoteSigner>(`/quotes/${id}/countersign`, { signatureImage }),
  getSettings: () => get<{ defaultExpirationDays: number }>('/quotes/settings'),
  updateSettings: (defaultExpirationDays: number) =>
    put<{ defaultExpirationDays: number }>('/quotes/settings', { defaultExpirationDays }),
  getSignerSetting: () => get<{ defaultSignerUserId: string | null; defaultSignerName: string | null }>('/quotes/settings/signer'),
  updateSignerSetting: (defaultSignerUserId: string | null) =>
    put<{ defaultSignerUserId: string | null }>('/quotes/settings/signer', { defaultSignerUserId }),
  create: (dealId: string) => post<Quote>('/quotes', { dealId }),
  updateDeal: (id: string, dealId: string) => put<Quote>(`/quotes/${id}/deal`, { dealId }),
  updateBuyer: (id: string, companyId: string, contactIds: string[]) =>
    put<Quote>(`/quotes/${id}/buyer`, { companyId, contactIds }),
  updateSender: (id: string, input: UpdateQuoteSenderInput) => put<Quote>(`/quotes/${id}/sender`, input),
  updateDetails: (id: string, input: UpdateQuoteDetailsInput) => put<Quote>(`/quotes/${id}/details`, input),
  delete: (id: string) => del<void>(`/quotes/${id}`),
  getLineItems: (id: string) => get<LineItem[]>(`/quotes/${id}/line-items`),
  createLineItem: (id: string, input: CreateLineItemInput) => post<LineItem>(`/quotes/${id}/line-items`, input),
  updateLineItem: (id: string, lineItemId: string, input: UpdateLineItemInput) =>
    put<LineItem>(`/quotes/${id}/line-items/${lineItemId}`, input),
  deleteLineItem: (id: string, lineItemId: string) => del<void>(`/quotes/${id}/line-items/${lineItemId}`),
  reorderLineItems: (id: string, lineItemIds: string[]) =>
    put<void>(`/quotes/${id}/line-items/reorder`, { lineItemIds }),
  getDiscounts: (id: string) => get<QuoteDiscount[]>(`/quotes/${id}/discounts`),
  createDiscount: (id: string, input: CreateQuoteDiscountInput) => post<QuoteDiscount>(`/quotes/${id}/discounts`, input),
  updateDiscount: (id: string, discountId: string, input: UpdateQuoteDiscountInput) =>
    put<QuoteDiscount>(`/quotes/${id}/discounts/${discountId}`, input),
  deleteDiscount: (id: string, discountId: string) => del<void>(`/quotes/${id}/discounts/${discountId}`),
  publish: (id: string) => put<Quote>(`/quotes/${id}/publish`, {}),
  recall: (id: string) => put<Quote>(`/quotes/${id}/recall`, {}),
};

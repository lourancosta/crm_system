import { del, get, post, put } from '../../../shared/api/client';
import type {
  AssociatedCompany,
  AssociatedContact,
  AssociatedInvoice,
  AvailableCreditMemo,
  CreateCreditMemoInput,
  CreditMemo,
  UpdateCreditMemoInput,
} from '../../../shared/types/index';

export type PaginatedCreditMemos = {
  data: CreditMemo[];
  total: number;
  page: number;
  limit: number;
};

export const creditMemosApi = {
  list: (page = 1, limit = 50, search = '', status = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return get<PaginatedCreditMemos>(`/credit-memos?${params}`);
  },
  getById: (id: string) => get<CreditMemo>(`/credit-memos/${id}`),
  create: (input: CreateCreditMemoInput) => post<CreditMemo>('/credit-memos', input),
  update: (id: string, input: UpdateCreditMemoInput) => put<CreditMemo>(`/credit-memos/${id}`, input),
  delete: (id: string) => del<void>(`/credit-memos/${id}`),
  void: (id: string) => post<CreditMemo>(`/credit-memos/${id}/void`, {}),
  getInvoices: (id: string) => get<AssociatedInvoice[]>(`/credit-memos/${id}/invoices`),
  getCompanies: (id: string) => get<AssociatedCompany[]>(`/credit-memos/${id}/companies`),
  getContacts: (id: string) => get<AssociatedContact[]>(`/credit-memos/${id}/contacts`),
  getAvailableForCompany: (companyId: string, excludeInvoiceId?: string) => {
    const params = new URLSearchParams({ companyId });
    if (excludeInvoiceId) params.set('excludeInvoiceId', excludeInvoiceId);
    return get<AvailableCreditMemo[]>(`/credit-memos/available?${params}`);
  },
};

import { del, get, patch, post, put } from '../../../shared/api/client';
import type {
  AssociatedCompany,
  AssociatedContact,
  AssociatedInvoice,
  AssociatedQuote,
  BoardDeal,
  CreateDealInput,
  Deal,
  UpdateDealInput,
} from '../../../shared/types/index';

export type PaginatedDeals = {
  data: Deal[];
  total: number;
  page: number;
  limit: number;
};

export const dealsApi = {
  list: (page = 1, limit = 50, search = '', pipeline = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (pipeline) params.set('pipeline', pipeline);
    return get<PaginatedDeals>(`/deals?${params}`);
  },
  board: (search = '') => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    return get<BoardDeal[]>(`/deals/board?${params}`);
  },
  getById: (id: string) => get<Deal>(`/deals/${id}`),
  create: (input: CreateDealInput) => post<Deal>('/deals', input),
  updateStage: (id: string, stage: string) => patch<Deal>(`/deals/${id}/stage`, { stage }),
  update: (id: string, input: UpdateDealInput) => put<Deal>(`/deals/${id}`, input),
  delete: (id: string) => del<void>(`/deals/${id}`),
  getCompanies: (id: string) => get<AssociatedCompany[]>(`/deals/${id}/companies`),
  getContacts: (id: string) => get<AssociatedContact[]>(`/deals/${id}/contacts`),
  getQuotes: (id: string) => get<AssociatedQuote[]>(`/deals/${id}/quotes`),
  getInvoices: (id: string) => get<AssociatedInvoice[]>(`/deals/${id}/invoices`),
};

import { del, get, post, put } from '../../../shared/api/client';
import type {
  AssociatedCompany,
  AssociatedContact,
  AssociatedDeal,
  AssociatedInvoice,
  AssociatedLicense,
  AssociatedTicket,
  Company,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../../../shared/types/index';

export type PaginatedCompanies = {
  data: Company[];
  total: number;
  page: number;
  limit: number;
};

export const companiesApi = {
  list: (page = 1, limit = 50, search = '', type = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    return get<PaginatedCompanies>(`/companies?${params}`);
  },
  getById: (id: string) => get<Company>(`/companies/${id}`),
  create: (input: CreateCompanyInput) => post<Company>('/companies', input),
  update: (id: string, input: UpdateCompanyInput) => put<Company>(`/companies/${id}`, input),
  delete: (id: string) => del<void>(`/companies/${id}`),
  getCompanies: (id: string) => get<AssociatedCompany[]>(`/companies/${id}/companies`),
  getContacts: (id: string) => get<AssociatedContact[]>(`/companies/${id}/contacts`),
  getDeals: (id: string) => get<AssociatedDeal[]>(`/companies/${id}/deals`),
  getTickets: (id: string) => get<AssociatedTicket[]>(`/companies/${id}/tickets`),
  getLicenses: (id: string) => get<AssociatedLicense[]>(`/companies/${id}/licenses`),
  getInvoices: (id: string) => get<AssociatedInvoice[]>(`/companies/${id}/invoices`),
};

import { del, get, post, put } from '../../../shared/api/client';
import type {
  AssociatedCompany,
  AssociatedDeal,
  AssociatedPartnership,
  AssociatedTicket,
  Contact,
  CreateContactInput,
  UpdateContactInput,
} from '../../../shared/types/index';

export type PaginatedContacts = {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
};

export const contactsApi = {
  list: (page = 1, limit = 50, search = '', companyId = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (companyId) params.set('companyId', companyId);
    return get<PaginatedContacts>(`/contacts?${params}`);
  },
  getById: (id: string) => get<Contact>(`/contacts/${id}`),
  create: (data: CreateContactInput) => post<Contact>('/contacts', data),
  update: (id: string, data: UpdateContactInput) => put<Contact>(`/contacts/${id}`, data),
  delete: (id: string) => del(`/contacts/${id}`),
  getCompanies: (id: string) => get<AssociatedCompany[]>(`/contacts/${id}/companies`),
  getDeals: (id: string) => get<AssociatedDeal[]>(`/contacts/${id}/deals`),
  getPartnerships: (id: string) => get<AssociatedPartnership[]>(`/contacts/${id}/partnerships`),
  getTickets: (id: string) => get<AssociatedTicket[]>(`/contacts/${id}/tickets`),
};

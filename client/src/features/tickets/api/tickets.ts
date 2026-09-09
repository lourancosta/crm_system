import { del, get, patch, post, put } from '../../../shared/api/client';
import type {
  AssociatedCompany,
  AssociatedContact,
  AssociatedDeal,
  BoardTicket,
  CreateTicketInput,
  Ticket,
  UpdateTicketInput,
} from '../../../shared/types/index';

export type PaginatedTickets = {
  data: Ticket[];
  total: number;
  page: number;
  limit: number;
};

export const ticketsApi = {
  list: (page = 1, limit = 50, search = '', pipeline = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (pipeline) params.set('pipeline', pipeline);
    return get<PaginatedTickets>(`/tickets?${params}`);
  },
  board: (search = '') => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    return get<BoardTicket[]>(`/tickets/board?${params}`);
  },
  getById: (id: string) => get<Ticket>(`/tickets/${id}`),
  create: (input: CreateTicketInput) => post<Ticket>('/tickets', input),
  updateStage: (id: string, stage: string) => patch<Ticket>(`/tickets/${id}/stage`, { stage }),
  update: (id: string, input: UpdateTicketInput) => put<Ticket>(`/tickets/${id}`, input),
  delete: (id: string) => del<void>(`/tickets/${id}`),
  getContacts: (id: string) => get<AssociatedContact[]>(`/tickets/${id}/contacts`),
  getCompanies: (id: string) => get<AssociatedCompany[]>(`/tickets/${id}/companies`),
  getDeals: (id: string) => get<AssociatedDeal[]>(`/tickets/${id}/deals`),
  sendReply: (id: string, content: string) => post<{ success: true }>(`/tickets/${id}/reply`, { content }),
};

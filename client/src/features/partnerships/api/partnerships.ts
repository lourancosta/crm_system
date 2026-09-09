import { del, get, patch, post, put } from '../../../shared/api/client';
import type {
  AssociatedCompany,
  AssociatedContact,
  BoardPartnership,
  CreatePartnershipInput,
  Partnership,
  UpdatePartnershipInput,
} from '../../../shared/types/index';

export type PaginatedPartnerships = {
  data: Partnership[];
  total: number;
  page: number;
  limit: number;
};

export const partnershipsApi = {
  list: (page = 1, limit = 50, search = '', pipeline = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (pipeline) params.set('pipeline', pipeline);
    return get<PaginatedPartnerships>(`/partnerships?${params}`);
  },
  board: (search = '') => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    return get<BoardPartnership[]>(`/partnerships/board?${params}`);
  },
  getById: (id: string) => get<Partnership>(`/partnerships/${id}`),
  getCompanies: (id: string) => get<AssociatedCompany[]>(`/partnerships/${id}/companies`),
  getContacts: (id: string) => get<AssociatedContact[]>(`/partnerships/${id}/contacts`),
  create: (input: CreatePartnershipInput) => post<Partnership>('/partnerships', input),
  updateStage: (id: string, stage: string) => patch<Partnership>(`/partnerships/${id}/stage`, { stage }),
  update: (id: string, input: UpdatePartnershipInput) => put<Partnership>(`/partnerships/${id}`, input),
  delete: (id: string) => del<void>(`/partnerships/${id}`),
};

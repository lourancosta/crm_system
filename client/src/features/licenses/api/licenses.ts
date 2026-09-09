import { del, get, post, put } from '../../../shared/api/client';
import type { AssociatedCompany, CreateLicenseInput, License, UpdateLicenseInput } from '../../../shared/types/index';

export type PaginatedLicenses = {
  data: License[];
  total: number;
  page: number;
  limit: number;
};

export const licensesApi = {
  list: (page = 1, limit = 50, search = '', status = '', subscription = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (subscription) params.set('subscription', subscription);
    return get<PaginatedLicenses>(`/licenses?${params}`);
  },
  getById: (id: string) => get<License>(`/licenses/${id}`),
  create: (input: CreateLicenseInput) => post<License>('/licenses', input),
  update: (id: string, input: UpdateLicenseInput) => put<License>(`/licenses/${id}`, input),
  delete: (id: string) => del<void>(`/licenses/${id}`),
  getCompanies: (id: string) => get<AssociatedCompany[]>(`/licenses/${id}/companies`),
};

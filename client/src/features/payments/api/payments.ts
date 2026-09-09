import { del, get, post, put } from '../../../shared/api/client';
import type {
  AssociatedCompany,
  AssociatedInvoice,
  CreatePaymentInput,
  Payment,
  UpdatePaymentInput,
} from '../../../shared/types/index';

export type PaginatedPayments = {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
};

export const paymentsApi = {
  list: (page = 1, limit = 50, search = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    return get<PaginatedPayments>(`/payments?${params}`);
  },
  getById: (id: string) => get<Payment>(`/payments/${id}`),
  create: (input: CreatePaymentInput) => post<Payment>('/payments', input),
  update: (id: string, input: UpdatePaymentInput) => put<Payment>(`/payments/${id}`, input),
  delete: (id: string) => del<void>(`/payments/${id}`),
  getInvoices: (id: string) => get<AssociatedInvoice[]>(`/payments/${id}/invoices`),
  getCompanies: (id: string) => get<AssociatedCompany[]>(`/payments/${id}/companies`),
};

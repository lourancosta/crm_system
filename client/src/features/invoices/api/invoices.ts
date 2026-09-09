import { del, get, post, put } from '../../../shared/api/client';
import type {
  AssociatedCompany,
  AssociatedContact,
  AssociatedCreditMemo,
  AssociatedDeal,
  AssociatedPayment,
  CreateCreditMemoApplicationInput,
  CreateInvoiceDiscountInput,
  CreateInvoiceInput,
  CreateLineItemInput,
  CreditMemoApplication,
  Invoice,
  InvoiceClonePreview,
  InvoiceDiscount,
  LineItem,
  UpdateCreditMemoApplicationInput,
  UpdateInvoiceDetailsInput,
  UpdateInvoiceDiscountInput,
  UpdateLineItemInput,
} from '../../../shared/types/index';

export type PaginatedInvoices = {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
};

export const invoicesApi = {
  list: (page = 1, limit = 50, search = '', status = '', type = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    return get<PaginatedInvoices>(`/invoices?${params}`);
  },
  getById: (id: string) => get<Invoice>(`/invoices/${id}`),
  getNextNumber: () => get<{ nextNumber: string }>('/invoices/next-number'),
  create: (input: CreateInvoiceInput) => post<Invoice>('/invoices', input),
  getLineItems: (id: string) => get<LineItem[]>(`/invoices/${id}/line-items`),
  getCompanies: (id: string) => get<AssociatedCompany[]>(`/invoices/${id}/companies`),
  getContacts: (id: string) => get<AssociatedContact[]>(`/invoices/${id}/contacts`),
  getDeals: (id: string) => get<AssociatedDeal[]>(`/invoices/${id}/deals`),
  getPayments: (id: string) => get<AssociatedPayment[]>(`/invoices/${id}/payments`),
  getCreditMemos: (id: string) => get<AssociatedCreditMemo[]>(`/invoices/${id}/credit-memos`),
  update: (id: string, input: UpdateInvoiceDetailsInput) => put<Invoice>(`/invoices/${id}`, input),
  delete: (id: string) => del<void>(`/invoices/${id}`),
  createLineItem: (id: string, input: CreateLineItemInput) => post<LineItem>(`/invoices/${id}/line-items`, input),
  updateLineItem: (id: string, lineItemId: string, input: UpdateLineItemInput) =>
    put<LineItem>(`/invoices/${id}/line-items/${lineItemId}`, input),
  deleteLineItem: (id: string, lineItemId: string) => del<void>(`/invoices/${id}/line-items/${lineItemId}`),
  void: (id: string) => post<Invoice>(`/invoices/${id}/void`, {}),
  publish: (id: string) => post<Invoice>(`/invoices/${id}/publish`, {}),
  getClonePreview: (id: string) => get<InvoiceClonePreview>(`/invoices/${id}/clone`),
  getDiscounts: (id: string) => get<InvoiceDiscount[]>(`/invoices/${id}/discounts`),
  createDiscount: (id: string, input: CreateInvoiceDiscountInput) =>
    post<InvoiceDiscount>(`/invoices/${id}/discounts`, input),
  updateDiscount: (id: string, discountId: string, input: UpdateInvoiceDiscountInput) =>
    put<InvoiceDiscount>(`/invoices/${id}/discounts/${discountId}`, input),
  deleteDiscount: (id: string, discountId: string) => del<void>(`/invoices/${id}/discounts/${discountId}`),
  getCreditMemoApplications: (id: string) => get<CreditMemoApplication[]>(`/invoices/${id}/credit-memo-applications`),
  createCreditMemoApplication: (id: string, input: CreateCreditMemoApplicationInput) =>
    post<CreditMemoApplication>(`/invoices/${id}/credit-memo-applications`, input),
  updateCreditMemoApplication: (id: string, applicationId: string, input: UpdateCreditMemoApplicationInput) =>
    put<CreditMemoApplication>(`/invoices/${id}/credit-memo-applications/${applicationId}`, input),
  deleteCreditMemoApplication: (id: string, applicationId: string) =>
    del<void>(`/invoices/${id}/credit-memo-applications/${applicationId}`),
};

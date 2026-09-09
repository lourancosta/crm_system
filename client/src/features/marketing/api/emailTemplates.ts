import { del, get, post, put } from '../../../shared/api/client';
import type { CreateEmailTemplateInput, EmailTemplate, EmailTemplateObject, UpdateEmailTemplateInput } from '../../../shared/types/index';

export type PaginatedEmailTemplates = {
  data: EmailTemplate[];
  total: number;
  page: number;
  limit: number;
};

export type ListEmailTemplatesParams = {
  page?: number;
  limit?: number;
  search?: string;
  object?: EmailTemplateObject;
};

export const emailTemplatesApi = {
  list: (params: ListEmailTemplatesParams = {}) => {
    const search = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 50) });
    if (params.search) search.set('search', params.search);
    if (params.object) search.set('object', params.object);
    return get<PaginatedEmailTemplates>(`/email-templates?${search}`);
  },
  getById: (id: string) => get<EmailTemplate>(`/email-templates/${id}`),
  create: (input: CreateEmailTemplateInput) => post<EmailTemplate>('/email-templates', input),
  update: (id: string, input: UpdateEmailTemplateInput) => put<EmailTemplate>(`/email-templates/${id}`, input),
  delete: (id: string) => del(`/email-templates/${id}`),
};

import { del, get, post, put } from '../../../shared/api/client';
import type { CreateSupportInboxInput, SupportInbox, UpdateSupportInboxInput } from '../../../shared/types/index';

export const supportInboxApi = {
  list: () => get<SupportInbox[]>('/support-inboxes'),
  create: (input: CreateSupportInboxInput) => post<SupportInbox>('/support-inboxes', input),
  update: (id: string, input: UpdateSupportInboxInput) => put<SupportInbox>(`/support-inboxes/${id}`, input),
  delete: (id: string) => del(`/support-inboxes/${id}`),
};

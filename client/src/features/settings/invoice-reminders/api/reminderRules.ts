import type { CreateReminderRuleInput, ReminderRule, UpdateReminderRuleInput } from '../../../../shared/types/index';
import { del, get, post, put } from '../../../../shared/api/client';

export const reminderRulesApi = {
  list: () => get<ReminderRule[]>('/invoice-reminder-rules?objectType=invoices'),

  getById: (id: string) => get<ReminderRule>(`/invoice-reminder-rules/${id}`),

  create: (input: CreateReminderRuleInput) => post<ReminderRule>('/invoice-reminder-rules', input),

  update: (id: string, input: UpdateReminderRuleInput) =>
    put<ReminderRule>(`/invoice-reminder-rules/${id}`, input),

  delete: (id: string) => del(`/invoice-reminder-rules/${id}`),
};

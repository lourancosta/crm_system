// Extend this list when adding reminders for other record types (quotes,
// partnerships, users, etc.) — no schema change needed, just a new value here
// and a fetch/send implementation similar to invoiceReminder.service.ts.
export const REMINDER_OBJECT_TYPES = ['invoices'] as const;
export type ReminderObjectType = (typeof REMINDER_OBJECT_TYPES)[number];

export type ReminderRule = {
  id: string;
  objectType: string;
  label: string;
  daysBeforeTrigger: number;
  // Legacy inline content from before emailTemplateId existed — null for any
  // rule created going forward.
  subjectTemplate: string | null;
  bodyTemplate: string | null;
  emailTemplateId: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateReminderRuleInput = {
  objectType: ReminderObjectType;
  label: string;
  daysBeforeTrigger: number;
  emailTemplateId: string;
  enabled?: boolean;
};

export type UpdateReminderRuleInput = Partial<CreateReminderRuleInput>;

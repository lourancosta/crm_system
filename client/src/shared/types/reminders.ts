// Extend when adding reminders for other record types (quotes, partnerships,
// users, etc.) to match src/modules/notifications/reminderRule.types.ts.
export const REMINDER_OBJECT_TYPES = ['invoices'] as const;
export type ReminderObjectType = (typeof REMINDER_OBJECT_TYPES)[number];

export type ReminderRule = {
  id: string;
  objectType: string;
  label: string;
  daysBeforeTrigger: number;
  // Legacy inline content from before emailTemplateId existed.
  subjectTemplate: string | null;
  bodyTemplate: string | null;
  emailTemplateId: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateReminderRuleInput = {
  objectType: ReminderObjectType;
  label: string;
  daysBeforeTrigger: number;
  emailTemplateId: string;
  enabled?: boolean;
};

export type UpdateReminderRuleInput = Partial<CreateReminderRuleInput>;

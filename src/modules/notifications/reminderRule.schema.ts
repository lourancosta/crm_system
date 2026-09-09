import { z } from 'zod';
import { REMINDER_OBJECT_TYPES } from './reminderRule.types';

export const reminderRuleIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listReminderRulesQuerySchema = z.object({
  objectType: z.enum(REMINDER_OBJECT_TYPES).optional(),
});

export const createReminderRuleSchema = z.object({
  objectType: z.enum(REMINDER_OBJECT_TYPES).default('invoices'),
  label: z.string().min(1),
  daysBeforeTrigger: z.coerce.number().int(),
  emailTemplateId: z.string().uuid('Select an email template'),
  enabled: z.boolean().default(true),
});

export const updateReminderRuleSchema = createReminderRuleSchema.partial();

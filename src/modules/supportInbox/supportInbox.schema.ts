import { z } from 'zod';
import { SUPPORT_INBOX_AUTH_TYPES } from './supportInbox.types';

export const supportInboxIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

function requireAuthFields<T extends { authType: string; imapPassword?: string; msTenantId?: string; msClientId?: string; msClientSecret?: string }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  if (data.authType === 'password' && !data.imapPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['imapPassword'], message: 'Password is required' });
  }
  if (data.authType === 'microsoft_oauth') {
    if (!data.msTenantId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['msTenantId'], message: 'Tenant ID is required' });
    if (!data.msClientId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['msClientId'], message: 'Client ID is required' });
    if (!data.msClientSecret) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['msClientSecret'], message: 'Client secret is required' });
  }
}

export const createSupportInboxSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    imapHost: z.string().min(1, 'IMAP host is required'),
    imapPort: z.coerce.number().int().min(1).max(65535).default(993),
    imapSecure: z.coerce.boolean().default(true),
    imapUser: z.string().min(1, 'IMAP username is required'),
    authType: z.enum(SUPPORT_INBOX_AUTH_TYPES).default('password'),
    imapPassword: z.string().optional(),
    msTenantId: z.string().optional(),
    msClientId: z.string().optional(),
    msClientSecret: z.string().optional(),
    smtpHost: z.string().optional(),
    smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
    folder: z.string().min(1).default('INBOX'),
    pipelineId: z.string().uuid('Select a pipeline'),
    defaultStageId: z.string().uuid('Select a default stage'),
    enabled: z.coerce.boolean().default(false),
  })
  .superRefine(requireAuthFields);

export const updateSupportInboxSchema = z
  .object({
    name: z.string().min(1).optional(),
    imapHost: z.string().min(1).optional(),
    imapPort: z.coerce.number().int().min(1).max(65535).optional(),
    imapSecure: z.coerce.boolean().optional(),
    imapUser: z.string().min(1).optional(),
    authType: z.enum(SUPPORT_INBOX_AUTH_TYPES).optional(),
    imapPassword: z.string().optional(),
    msTenantId: z.string().optional(),
    msClientId: z.string().optional(),
    msClientSecret: z.string().optional(),
    smtpHost: z.string().optional(),
    smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
    folder: z.string().min(1).optional(),
    pipelineId: z.string().uuid().optional(),
    defaultStageId: z.string().uuid().optional(),
    enabled: z.coerce.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Only enforce required-fields-for-mode when authType is actually part of
    // this update - a partial update (e.g. just toggling `enabled`) shouldn't
    // be forced to resupply credentials it isn't touching.
    if (data.authType) requireAuthFields({ ...data, authType: data.authType }, ctx);
  });

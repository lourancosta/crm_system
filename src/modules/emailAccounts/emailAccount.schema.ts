import { z } from 'zod';
import { EMAIL_FEATURES } from './emailAccount.types';

export const emailAccountIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const featureParamsSchema = z.object({
  feature: z.enum(EMAIL_FEATURES),
});

export const createEmailAccountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  fromName: z.string().optional(),
  fromEmail: z.string().email('Must be a valid email address'),
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpUser: z.string().min(1, 'SMTP username is required'),
  smtpPassword: z.string().min(1, 'Password is required'),
});

export const updateEmailAccountSchema = z.object({
  name: z.string().min(1).optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  smtpHost: z.string().min(1).optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().min(1).optional(),
  smtpPassword: z.string().min(1).optional(),
});

export const setFeatureAssignmentSchema = z.object({
  emailAccountId: z.string().uuid().nullable(),
});

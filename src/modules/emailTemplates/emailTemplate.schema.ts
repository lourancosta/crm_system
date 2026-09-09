import { z } from 'zod';
import { EMAIL_TEMPLATE_OBJECTS } from './emailTemplate.types';

export const emailTemplateIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const listEmailTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  object: z.enum(EMAIL_TEMPLATE_OBJECTS).optional(),
});

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  htmlBody: z.string().default(''),
  objects: z.array(z.enum(EMAIL_TEMPLATE_OBJECTS)).default([]),
});

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial();

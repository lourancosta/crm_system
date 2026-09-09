import { z } from 'zod';

export const listContactsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  companyId: z.string().uuid().optional(),
});

export const contactIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const createContactSchema = z.object({
  firstname: z.string().min(1, 'firstname is required'),
  lastname: z.string().optional(),
  email: z.string().email('email must be valid'),
  phone: z.string().optional(),
  mobilephone: z.string().optional(),
  company: z.string().optional(),
  jobtitle: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();

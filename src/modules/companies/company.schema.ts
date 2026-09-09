import { z } from 'zod';

export const companyIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const listCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  // Restricts to companies of a given account type ('partner'/'customer') —
  // see TYPE_VALUES_BY_ACCOUNT_TYPE in company.repository.ts.
  type: z.string().optional(),
});

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().optional(),
  industry: z.string().optional(),
  salesRegion: z.string().optional(),
  lifecyclestage: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

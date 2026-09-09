import { z } from 'zod';

export const dealIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const listDealsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  pipeline: z.string().optional(),
});

export const createDealSchema = z.object({
  dealname: z.string().min(1, 'Deal name is required'),
  pipeline: z.string().optional(),
  dealstage: z.string().optional(),
  amount: z.string().optional(),
  closedate: z.string().optional(),
  certificationModules: z.string().optional(),
  dealPartnerType: z.string().optional(),
});

export const updateDealStageSchema = z.object({
  stage: z.string().min(1, 'Stage is required'),
});

export const updateDealSchema = createDealSchema.partial();

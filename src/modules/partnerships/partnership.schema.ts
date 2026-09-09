import { z } from 'zod';

export const partnershipIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const listPartnershipsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  pipeline: z.string().optional(),
});

export const createPartnershipSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  companyName: z.string().optional(),
  closeDate: z.string().optional(),
  typeObj: z.string().optional(),
  mspLevel: z.string().optional(),
  distributor: z.string().optional(),
  certificationPartnerPrograms: z.string().optional(),
});

export const updatePartnershipStageSchema = z.object({
  stage: z.string().min(1, 'Stage is required'),
});

export const updatePartnershipSchema = createPartnershipSchema.partial();

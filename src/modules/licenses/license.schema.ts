import { z } from 'zod';

export const listLicensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  status: z.enum(['active', 'expired', 'revoked']).optional(),
  subscription: z.enum(['msp', 'reseller']).optional(),
});

export const licenseIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const createLicenseSchema = z.object({
  name: z.string().min(1, 'name is required'),
  status: z.enum(['active', 'expired', 'revoked']).optional(),
  customerName: z.string().optional(),
  partnerName: z.string().optional(),
  typeObj: z.string().optional(),
  subscription: z.enum(['msp', 'reseller']).optional(),
  quantity: z.string().optional(),
  platformCreatedDate: z.string().optional(),
  activationDate: z.string().optional(),
  expirationDate: z.string().optional(),
  revokeDate: z.string().optional(),
  licenseGroup: z.string().optional(),
  module: z.string().optional(),
});

export const updateLicenseSchema = z.object({
  name: z.string().optional(),
  status: z.enum(['active', 'expired', 'revoked']).optional(),
  customerName: z.string().optional(),
  partnerName: z.string().optional(),
  typeObj: z.string().optional(),
  subscription: z.enum(['msp', 'reseller']).optional(),
  quantity: z.string().optional(),
  activationDate: z.string().optional(),
  expirationDate: z.string().optional(),
  revokeDate: z.string().optional(),
  licenseGroup: z.string().optional(),
  module: z.string().optional(),
});

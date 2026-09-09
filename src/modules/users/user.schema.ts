import { z } from 'zod';
import { ACCOUNT_TYPES, PORTAL_ROLES } from '../../lib/permissions';

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().default(''),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  accountType: z.enum(ACCOUNT_TYPES).optional(),
  role: z.enum(PORTAL_ROLES).optional(),
  password: z.string().min(6).optional(),
  companyId: z.string().uuid().nullable().optional(),
  hubspotOwnerId: z.string().nullable().optional(),
  permissionSetId: z.string().uuid().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export const createUserSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    accountType: z.enum(ACCOUNT_TYPES).default('internal'),
    role: z.enum(PORTAL_ROLES).optional(),
    companyId: z.string().uuid().optional(),
    permissionSetId: z.string().uuid().optional(),
    jobTitle: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine((d) => d.accountType === 'internal' || (d.role !== undefined && d.companyId !== undefined), {
    message: 'role and companyId are required for partner/customer users',
    path: ['role'],
  });

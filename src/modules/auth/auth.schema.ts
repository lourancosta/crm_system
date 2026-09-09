import { z } from 'zod';
import { LANDING_PAGE_OPTIONS } from '../../lib/permissions';

export const loginSchema = z.object({
  email: z.string().email('email must be valid'),
  password: z.string().min(1, 'password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('email must be valid'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token is required'),
  password: z.string().min(8, 'password must be at least 8 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'current password is required'),
  newPassword: z.string().min(8, 'password must be at least 8 characters'),
});

// Self-service profile update (Settings > Your Preferences > General >
// Profile) — deliberately narrower than the admin-only user.schema.ts's
// updateUserSchema: no email/accountType/permissionSetId/role, since a caller
// can only ever edit their own row through this endpoint.
export const updateMeSchema = z.object({
  firstName: z.string().min(1, 'first name is required'),
  lastName: z.string().min(1, 'last name is required'),
  phone: z.string().nullable().optional(),
  defaultLandingPage: z.enum(LANDING_PAGE_OPTIONS),
});

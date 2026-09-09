import { z } from 'zod';
import { MODULES } from '../../lib/permissions';

const scopeSchema = z.enum(['none', 'own', 'all']);

export const permissionSetIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const moduleInputSchema = z.object({
  module: z.enum(MODULES),
  viewScope: scopeSchema.optional(),
  canCreate: z.boolean().optional(),
  editScope: scopeSchema.optional(),
  deleteScope: scopeSchema.optional(),
  mergeScope: scopeSchema.optional(),
});

export const createPermissionSetSchema = z.object({
  name: z.string().min(1),
  modules: z.array(moduleInputSchema).optional(),
});

export const updatePermissionSetSchema = z.object({
  name: z.string().min(1).optional(),
  modules: z.array(moduleInputSchema).optional(),
});

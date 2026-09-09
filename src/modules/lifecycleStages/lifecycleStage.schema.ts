import { z } from 'zod';
import { LIFECYCLE_OBJECT_TYPES } from './lifecycleStage.types';

export const lifecycleObjectTypeQuerySchema = z.object({
  objectType: z.enum(LIFECYCLE_OBJECT_TYPES),
});

export const lifecycleStageIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const createLifecycleStageSchema = z.object({
  objectType: z.enum(LIFECYCLE_OBJECT_TYPES),
  externalName: z.string().min(1),
  internalName: z.string().min(1),
});

export const updateLifecycleStageSchema = z.object({
  externalName: z.string().min(1).optional(),
  internalName: z.string().min(1).optional(),
});

export const reorderLifecycleStagesSchema = z.object({
  stageIds: z.array(z.string().uuid()).min(1),
});

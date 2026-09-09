import { z } from 'zod';
import { PIPELINE_OBJECT_TYPES } from './pipeline.types';

export const pipelineObjectTypeQuerySchema = z.object({
  objectType: z.enum(PIPELINE_OBJECT_TYPES),
});

export const pipelineIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const stageParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  stageId: z.string().uuid('stageId must be a valid UUID'),
});

export const createPipelineSchema = z.object({
  objectType: z.enum(PIPELINE_OBJECT_TYPES),
  externalName: z.string().min(1),
  internalName: z.string().min(1),
});

export const updatePipelineSchema = z.object({
  externalName: z.string().min(1).optional(),
  internalName: z.string().min(1).optional(),
});

export const createStageSchema = z.object({
  externalName: z.string().min(1),
  internalName: z.string().min(1),
});

export const updateStageSchema = createStageSchema.partial();

export const reorderStagesSchema = z.object({
  stageIds: z.array(z.string().uuid()).min(1),
});

import { z } from "zod";
import { ASSOCIABLE_TYPES } from "../../lib/objectTypes";

const associableType = z.enum(ASSOCIABLE_TYPES);

export const createAssociationSchema = z.object({
  sourceType: associableType,
  sourceId: z.string().uuid("sourceId must be a valid UUID"),
  targetType: associableType,
  targetId: z.string().uuid("targetId must be a valid UUID"),
});

export const removeAssociationParamsSchema = z.object({
  sourceType: associableType,
  sourceId: z.string().uuid("sourceId must be a valid UUID"),
  targetType: associableType,
  targetId: z.string().uuid("targetId must be a valid UUID"),
});

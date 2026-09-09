import { z } from 'zod';
import {
  HISTORY_ACTIVITY_TYPES,
  HISTORY_LOGGABLE_OBJECT_TYPES,
  HISTORY_OBJECT_TYPES,
  LOGGABLE_ACTIVITY_TYPES,
} from './history.types';

export const historyParamsSchema = z.object({
  objectType: z.enum(HISTORY_OBJECT_TYPES),
  objectId: z.string().uuid('objectId must be a valid UUID'),
});

// Cursor is an opaque, server-generated token (see history.repository.ts's
// encodeCursor) — validated as a non-empty string here, decoded downstream.
export const historyQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  types: z
    .string()
    .min(1)
    .optional()
    .transform((val) => (val ? val.split(',') : undefined))
    .pipe(z.array(z.enum(HISTORY_ACTIVITY_TYPES)).optional()),
});

export const logActivityParamsSchema = z.object({
  objectType: z.enum(HISTORY_LOGGABLE_OBJECT_TYPES),
  objectId: z.string().uuid('objectId must be a valid UUID'),
});

const associationsSchema = z
  .array(
    z.object({
      objectType: z.enum(HISTORY_LOGGABLE_OBJECT_TYPES),
      objectId: z.string().uuid(),
    }),
  )
  .optional();

export const createActivitySchema = z.object({
  type: z.enum(LOGGABLE_ACTIVITY_TYPES),
  content: z.string().min(1, 'content is required'),
  associations: associationsSchema,
});

export const historyEntryParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

// content/type are omitted entirely when editing an email entry's
// associations only — email content/type are never user-editable (see
// history.service.ts::updateActivity), so the request just carries
// associations in that case. associationScopeTargets tells the backend
// exactly which (objectType, objectId) pairs the editing UI offered as
// checkboxes, so it never deletes an association that wasn't actually shown
// (e.g. a synced email's ticket association, or a contact not related to
// the company being edited from).
export const updateActivitySchema = z.object({
  type: z.enum(LOGGABLE_ACTIVITY_TYPES).optional(),
  content: z.string().min(1, 'content is required').optional(),
  associations: associationsSchema,
  associationScopeTargets: associationsSchema,
});

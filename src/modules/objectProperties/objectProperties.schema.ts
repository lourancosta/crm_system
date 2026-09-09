import { z } from "zod";

// Identical set of objects as the client's Settings > Objects dropdown
// (client/src/features/settings/objects/ObjectsPage.tsx's OBJECT_OPTIONS) —
// keep these two lists in sync.
export const OBJECT_TYPES = [
  "contacts",
  "companies",
  "deals",
  "tickets",
  "partnerships",
  "quotes",
  "invoices",
  "payments",
  "licenses",
  "creditMemos",
  "products",
] as const;

export type ObjectType = (typeof OBJECT_TYPES)[number];

export const listPropertiesQuerySchema = z.object({
  object: z.enum(OBJECT_TYPES),
});

export const groupIdParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export const createGroupSchema = z.object({
  object: z.enum(OBJECT_TYPES),
  label: z.string().trim().min(1, "Group name is required"),
});

export const updateGroupSchema = z.object({
  label: z.string().trim().min(1, "Group name is required"),
});

export const columnNameParamsSchema = z.object({
  columnName: z.string().min(1),
});

export const updatePropertySchema = z.object({
  object: z.enum(OBJECT_TYPES),
  label: z.string().trim().min(1, "Property name is required"),
  groupId: z.string().uuid().nullable(),
});

export const recordValuesQuerySchema = listPropertiesQuerySchema.extend({
  id: z.string().uuid("id must be a valid UUID"),
});

export const updateRecordValuesSchema = z.object({
  object: z.enum(OBJECT_TYPES),
  id: z.string().uuid("id must be a valid UUID"),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

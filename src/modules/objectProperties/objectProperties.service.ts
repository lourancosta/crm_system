import * as repository from "./objectProperties.repository";
import { deriveLabel, slugifyUnique } from "./objectProperties.labels";
import type { ObjectType } from "./objectProperties.schema";
import type { ObjectProperty, PropertyGroup } from "./objectProperties.types";

// Physical table backing each settings "object" — same values as the
// dropdown except creditMemos, which maps to the singular `credit_memo`
// table (see src/db/lightTables.ts's creditMemoLite).
const OBJECT_TABLE_NAMES: Record<ObjectType, string> = {
  contacts: "contacts",
  companies: "companies",
  deals: "deals",
  tickets: "tickets",
  partnerships: "partnerships",
  quotes: "quotes",
  invoices: "invoices",
  payments: "payments",
  licenses: "licenses",
  creditMemos: "credit_memo",
  products: "products",
};

function httpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

// System/bookkeeping columns no inline edit UI should ever write to — sync
// identity (id, hubspot_id), soft-delete (archived), the raw sync payload,
// and timestamps this app manages itself. Enforced here regardless of what
// the client sends (defense in depth — the panel's own denylist already
// keeps these out of its inputs, but this is the actual boundary).
const NON_EDITABLE_COLUMNS = new Set(["id", "hubspot_id", "archived", "raw_hubspot_payload", "created_at", "updated_at"]);

// Reads live from information_schema rather than any static/hand-maintained
// list — these tables are wide (600+ columns for contacts/tickets) and
// auto-altered by the external crm-migration sync tool whenever HubSpot adds
// a property, so a static list would go stale the moment a new property
// syncs in. label falls back to the auto-derived default unless an admin
// has set a custom one via the Properties tab's Edit action; groupLabel is
// null unless an admin has assigned one.
export async function listProperties(object: ObjectType): Promise<ObjectProperty[]> {
  const tableName = OBJECT_TABLE_NAMES[object];
  const [columns, overrides] = await Promise.all([
    repository.findColumnsForTable(tableName),
    repository.findPropertyOverridesForTable(tableName),
  ]);
  return columns.map((c) => {
    const override = overrides.get(c.columnName);
    return {
      ...c,
      label: override?.label ?? deriveLabel(c.columnName, object),
      groupId: override?.groupId ?? null,
      groupLabel: override?.groupLabel ?? null,
    };
  });
}

export async function listGroups(object: ObjectType): Promise<PropertyGroup[]> {
  const tableName = OBJECT_TABLE_NAMES[object];
  return repository.findGroupsForTable(tableName);
}

export async function createGroup(object: ObjectType, label: string): Promise<PropertyGroup> {
  const tableName = OBJECT_TABLE_NAMES[object];
  const existingSlugs = await repository.findExistingGroupSlugs(tableName);
  const hubspotGroupName = slugifyUnique(label, existingSlugs);
  const id = await repository.createGroup(tableName, hubspotGroupName, label);
  return { id, hubspotGroupName, label, displayOrder: null, propertyCount: 0 };
}

export async function updateGroup(id: string, label: string): Promise<PropertyGroup> {
  const existing = await repository.findGroupById(id);
  if (!existing) throw httpError("Property group not found", 404);
  await repository.updateGroupLabel(id, label);
  return { id, hubspotGroupName: existing.hubspotGroupName, label, displayOrder: null, propertyCount: existing.propertyCount };
}

export async function deleteGroup(id: string): Promise<void> {
  const existing = await repository.findGroupById(id);
  if (!existing) throw httpError("Property group not found", 404);
  if (existing.propertyCount > 0) {
    throw httpError(
      `Can't delete "${existing.label}" — ${existing.propertyCount} propert${existing.propertyCount === 1 ? "y is" : "ies are"} still assigned to it. Reassign them first.`,
      400,
    );
  }
  await repository.deleteGroup(id);
}

export async function updateProperty(
  object: ObjectType,
  columnName: string,
  data: { label: string; groupId: string | null },
): Promise<void> {
  const tableName = OBJECT_TABLE_NAMES[object];
  const exists = await repository.columnExists(tableName, columnName);
  if (!exists) throw httpError(`"${columnName}" is not a property of this object`, 404);

  if (data.groupId) {
    const group = await repository.findGroupById(data.groupId);
    if (!group || group.tableName !== tableName) throw httpError("Property group not found for this object", 400);
  }

  await repository.upsertPropertyOverride(tableName, columnName, data);
}

export async function getRecordValues(object: ObjectType, id: string): Promise<Record<string, unknown>> {
  const tableName = OBJECT_TABLE_NAMES[object];
  const values = await repository.findRecordValues(tableName, id);
  if (!values) throw httpError("Record not found", 404);
  return values;
}

export async function updateRecordValues(object: ObjectType, id: string, values: Record<string, unknown>): Promise<void> {
  const tableName = OBJECT_TABLE_NAMES[object];
  const columns = await repository.findColumnsForTable(tableName);
  const validColumns = new Set(columns.map((c) => c.columnName));

  const toUpdate: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(values)) {
    if (NON_EDITABLE_COLUMNS.has(column)) continue;
    if (!validColumns.has(column)) throw httpError(`"${column}" is not a property of this object`, 400);
    toUpdate[column] = value;
  }
  if (Object.keys(toUpdate).length === 0) return;

  const updated = await repository.updateRecordValues(tableName, id, toUpdate);
  if (!updated) throw httpError("Record not found", 404);
}

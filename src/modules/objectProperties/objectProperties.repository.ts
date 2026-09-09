import { randomUUID } from "crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { readerPool, writerPool } from "../../db/client";

interface ColumnRow extends RowDataPacket {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

// mysql2 returns information_schema result columns in the catalog's own
// uppercase casing (COLUMN_NAME) regardless of how the SELECT list is typed —
// explicit aliases sidestep that (same gotcha the crm-migration sync tool's
// own information_schema queries work around).
export async function findColumnsForTable(tableName: string): Promise<Array<{ columnName: string; dataType: string; nullable: boolean }>> {
  const [rows] = await readerPool.query<ColumnRow[]>(
    `SELECT COLUMN_NAME AS column_name, DATA_TYPE AS data_type, IS_NULLABLE AS is_nullable
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ?
     ORDER BY ORDINAL_POSITION;`,
    [tableName],
  );
  return rows.map((r) => ({
    columnName: r.column_name,
    dataType: r.data_type,
    nullable: r.is_nullable === "YES",
  }));
}

// Raw column values for one record — deliberately bypasses Drizzle's typed
// query builder (same reason findColumnsForTable does): contacts/tickets
// have 600+ real columns, and building a query-builder select that wide
// blows TypeScript's instantiation-depth limit (see src/db/lightTables.ts's
// header comment). This is the one place in the app that reads every
// column of a record — everywhere else deliberately reads a curated subset.
export async function findRecordValues(tableName: string, id: string): Promise<Record<string, unknown> | null> {
  const [rows] = await readerPool.query<RowDataPacket[]>(`SELECT * FROM \`${tableName}\` WHERE id = ? LIMIT 1;`, [id]);
  return rows[0] ?? null;
}

// Dynamic column UPDATE — the write-side counterpart to findRecordValues.
// Column names in `values` are never attacker-controlled directly: the
// service layer validates every key against findColumnsForTable's real
// column list (and drops the system-column denylist) before this ever runs,
// so interpolating them into backtick-quoted identifiers here is safe —
// values themselves stay fully parameterized. Returns whether a row
// actually matched, so the service can 404 on a bad id.
export async function updateRecordValues(tableName: string, id: string, values: Record<string, unknown>): Promise<boolean> {
  const columns = Object.keys(values);
  if (columns.length === 0) return true;
  const setClause = columns.map((c) => `\`${c}\` = ?`).join(", ");
  const params = [...columns.map((c) => values[c]), id];
  const [result] = await writerPool.query<ResultSetHeader>(
    `UPDATE \`${tableName}\` SET ${setClause}, \`updated_at\` = CURRENT_TIMESTAMP WHERE id = ?;`,
    params,
  );
  return result.affectedRows > 0;
}

export async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await readerPool.query<RowDataPacket[]>(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1;`,
    [tableName, columnName],
  );
  return rows.length > 0;
}

interface PropertyOverrideRow extends RowDataPacket {
  column_name: string;
  label: string | null;
  group_id: string | null;
  group_label: string | null;
}

export async function findPropertyOverridesForTable(
  tableName: string,
): Promise<Map<string, { label: string | null; groupId: string | null; groupLabel: string | null }>> {
  const [rows] = await readerPool.query<PropertyOverrideRow[]>(
    `SELECT p.column_name AS column_name, p.label AS label, p.group_id AS group_id, pg.label AS group_label
     FROM properties p
     LEFT JOIN property_groups pg ON pg.id = p.group_id
     WHERE p.table_name = ?;`,
    [tableName],
  );
  const map = new Map<string, { label: string | null; groupId: string | null; groupLabel: string | null }>();
  for (const r of rows) map.set(r.column_name, { label: r.label, groupId: r.group_id, groupLabel: r.group_label });
  return map;
}

// Sparse upsert — one row per (table_name, column_name), created on first
// edit and updated on every edit after that (see schema.ts's `property`
// table comment for why this is sparse rather than one row per column).
export async function upsertPropertyOverride(
  tableName: string,
  columnName: string,
  data: { label: string; groupId: string | null },
): Promise<void> {
  await writerPool.query(
    `INSERT INTO properties (table_name, column_name, label, group_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE label = VALUES(label), group_id = VALUES(group_id);`,
    [tableName, columnName, data.label, data.groupId],
  );
}

interface GroupRow extends RowDataPacket {
  id: string;
  table_name: string;
  hubspot_group_name: string;
  label: string;
  display_order: number | null;
  property_count: number;
}

export async function findGroupsForTable(tableName: string): Promise<
  Array<{ id: string; hubspotGroupName: string; label: string; displayOrder: number | null; propertyCount: number }>
> {
  const [rows] = await readerPool.query<GroupRow[]>(
    `SELECT pg.id AS id, pg.table_name AS table_name, pg.hubspot_group_name AS hubspot_group_name, pg.label AS label, pg.display_order AS display_order,
            COUNT(p.column_name) AS property_count
     FROM property_groups pg
     LEFT JOIN properties p ON p.group_id = pg.id
     WHERE pg.table_name = ?
     GROUP BY pg.id, pg.table_name, pg.hubspot_group_name, pg.label, pg.display_order
     ORDER BY pg.display_order IS NULL, pg.display_order, pg.label;`,
    [tableName],
  );
  return rows.map((r) => ({
    id: r.id,
    hubspotGroupName: r.hubspot_group_name,
    label: r.label,
    displayOrder: r.display_order,
    propertyCount: Number(r.property_count),
  }));
}

export async function findExistingGroupSlugs(tableName: string): Promise<Set<string>> {
  const [rows] = await readerPool.query<RowDataPacket[]>(
    `SELECT hubspot_group_name AS hubspot_group_name FROM property_groups WHERE table_name = ?;`,
    [tableName],
  );
  return new Set(rows.map((r) => r.hubspot_group_name as string));
}

export async function findGroupById(
  id: string,
): Promise<{ id: string; tableName: string; hubspotGroupName: string; label: string; propertyCount: number } | null> {
  const [rows] = await readerPool.query<GroupRow[]>(
    `SELECT pg.id AS id, pg.table_name AS table_name, pg.hubspot_group_name AS hubspot_group_name, pg.label AS label,
            (SELECT COUNT(*) FROM properties p WHERE p.group_id = pg.id) AS property_count
     FROM property_groups pg
     WHERE pg.id = ?
     LIMIT 1;`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, tableName: r.table_name, hubspotGroupName: r.hubspot_group_name, label: r.label, propertyCount: Number(r.property_count) };
}

export async function createGroup(tableName: string, hubspotGroupName: string, label: string): Promise<string> {
  const id = randomUUID();
  await writerPool.query(
    `INSERT INTO property_groups (id, table_name, hubspot_group_name, label) VALUES (?, ?, ?, ?);`,
    [id, tableName, hubspotGroupName, label],
  );
  return id;
}

export async function updateGroupLabel(id: string, label: string): Promise<void> {
  await writerPool.query(`UPDATE property_groups SET label = ? WHERE id = ?;`, [label, id]);
}

// Callers must have already verified propertyCount === 0 — the FK is
// ON DELETE SET NULL, not RESTRICT, so this would otherwise silently
// orphan any properties still pointing at this group.
export async function deleteGroup(id: string): Promise<void> {
  await writerPool.query(`DELETE FROM property_groups WHERE id = ?;`, [id]);
}

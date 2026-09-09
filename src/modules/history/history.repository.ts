import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { recordHistory, users } from '../../db/schema';
import { SYSTEM_USER_ID } from '../users/user.types';
import type { HistoryActivityType, HistoryEntry, LogHistoryEventInput } from './history.types';

const DEFAULT_PAGE_SIZE = 40;

// Opaque keyset-pagination cursor: base64("<ISO occurredAt>|<id>"). id is an
// arbitrary (not semantically ordered) tiebreaker for rows sharing the same
// occurredAt — it only needs to be consistent between ORDER BY and the
// cursor WHERE clause below, not meaningful on its own.
export function encodeCursor(occurredAt: Date, id: string): string {
  return Buffer.from(`${occurredAt.toISOString()}|${id}`).toString('base64');
}

export function decodeCursor(cursor: string): { occurredAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const [iso, id] = decoded.split('|');
    if (!iso || !id) return null;
    const occurredAt = new Date(iso);
    if (Number.isNaN(occurredAt.getTime())) return null;
    return { occurredAt, id };
  } catch {
    return null;
  }
}

export type ListForRecordOptions = {
  cursor?: string | null;
  limit?: number;
  types?: HistoryActivityType[];
};

export type ListForRecordResult = {
  entries: HistoryEntry[];
  nextCursor: string | null;
};

const ENTRY_COLUMNS = {
  id: recordHistory.id,
  objectType: recordHistory.objectType,
  objectId: recordHistory.objectId,
  type: recordHistory.type,
  title: recordHistory.title,
  description: recordHistory.description,
  occurredAt: recordHistory.occurredAt,
  activityGroupId: recordHistory.activityGroupId,
  userId: recordHistory.userId,
  userName: sql<string | null>`concat(${users.firstName}, ' ', ${users.lastName})`,
};

export async function listForRecord(
  objectType: string,
  objectId: string,
  options: ListForRecordOptions = {},
): Promise<ListForRecordResult> {
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;
  const cursor = options.cursor ? decodeCursor(options.cursor) : null;

  const conditions = [eq(recordHistory.objectType, objectType), eq(recordHistory.objectId, objectId)];

  if (options.types && options.types.length > 0) {
    conditions.push(inArray(recordHistory.type, options.types));
  }

  if (cursor) {
    conditions.push(
      or(
        lt(recordHistory.occurredAt, cursor.occurredAt),
        and(eq(recordHistory.occurredAt, cursor.occurredAt), lt(recordHistory.id, cursor.id)),
      )!,
    );
  }

  const rows = await db
    .select(ENTRY_COLUMNS)
    .from(recordHistory)
    .leftJoin(users, eq(users.id, recordHistory.userId))
    .where(and(...conditions))
    .orderBy(desc(recordHistory.occurredAt), desc(recordHistory.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1] as HistoryEntry | undefined;
  const nextCursor = hasMore && last ? encodeCursor(last.occurredAt, last.id) : null;

  return { entries: page as HistoryEntry[], nextCursor };
}

// Allows callers (e.g. emailActivity's transactional dedup+log) to pass a
// Drizzle transaction client so this insert participates in an outer
// transaction instead of committing independently.
export type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function create(input: LogHistoryEventInput, tx: DbClient = db): Promise<void> {
  await tx.insert(recordHistory).values({
    objectType: input.objectType,
    objectId: input.objectId,
    type: input.type ?? 'system',
    title: input.title,
    description: input.description ?? null,
    userId: input.userId ?? SYSTEM_USER_ID,
    activityGroupId: input.activityGroupId ?? null,
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
  });
}

export async function findEntryById(id: string): Promise<HistoryEntry | null> {
  const rows = await db
    .select(ENTRY_COLUMNS)
    .from(recordHistory)
    .leftJoin(users, eq(users.id, recordHistory.userId))
    .where(eq(recordHistory.id, id))
    .limit(1);
  return (rows[0] as HistoryEntry) ?? null;
}

export async function update(id: string, data: { type: string; title: string; description: string }): Promise<void> {
  await db.update(recordHistory).set(data).where(eq(recordHistory.id, id));
}

export async function remove(id: string): Promise<void> {
  await db.delete(recordHistory).where(eq(recordHistory.id, id));
}

export async function removeByGroupId(activityGroupId: string): Promise<void> {
  await db.delete(recordHistory).where(eq(recordHistory.activityGroupId, activityGroupId));
}

export async function listByGroupId(activityGroupId: string): Promise<HistoryEntry[]> {
  const rows = await db
    .select(ENTRY_COLUMNS)
    .from(recordHistory)
    .leftJoin(users, eq(users.id, recordHistory.userId))
    .where(eq(recordHistory.activityGroupId, activityGroupId));
  return rows as HistoryEntry[];
}

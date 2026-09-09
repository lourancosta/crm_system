import { randomUUID } from 'crypto';
import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { company, contact, lifecycleStage } from '../../db/schema';
import type { CreateLifecycleStageInput, DetectedValue, LifecycleObjectType, LifecycleStageRecord, UpdateLifecycleStageInput } from './lifecycleStage.types';

export async function findAllByObjectType(objectType: string): Promise<LifecycleStageRecord[]> {
  return db
    .select()
    .from(lifecycleStage)
    .where(eq(lifecycleStage.objectType, objectType))
    .orderBy(asc(lifecycleStage.sortOrder));
}

export async function findById(id: string): Promise<LifecycleStageRecord | null> {
  const rows = await db.select().from(lifecycleStage).where(eq(lifecycleStage.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function create(input: CreateLifecycleStageInput): Promise<LifecycleStageRecord> {
  const maxRow = await db
    .select({ max: sql<number>`coalesce(max(${lifecycleStage.sortOrder}), -1)` })
    .from(lifecycleStage)
    .where(eq(lifecycleStage.objectType, input.objectType));
  const sortOrder = Number(maxRow[0]?.max ?? -1) + 1;

  const id = randomUUID();
  await db
    .insert(lifecycleStage)
    .values({ id, ...input, sortOrder });
  const rows = await db.select().from(lifecycleStage).where(eq(lifecycleStage.id, id)).limit(1);
  return rows[0];
}

export async function update(id: string, input: UpdateLifecycleStageInput): Promise<LifecycleStageRecord | null> {
  await db
    .update(lifecycleStage)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(lifecycleStage.id, id));
  const rows = await db.select().from(lifecycleStage).where(eq(lifecycleStage.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await db.delete(lifecycleStage).where(eq(lifecycleStage.id, id));
  return result.affectedRows > 0;
}

export async function reorder(objectType: string, stageIds: string[]): Promise<void> {
  await Promise.all(
    stageIds.map((id, index) =>
      db
        .update(lifecycleStage)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(and(eq(lifecycleStage.id, id), eq(lifecycleStage.objectType, objectType))),
    ),
  );
}

const DETECTED_VALUE_SOURCES: Record<LifecycleObjectType, { table: any; column: any }> = {
  contacts: { table: contact, column: contact.lifecyclestage },
  companies: { table: company, column: company.lifecyclestage },
};

export async function getDetectedValues(objectType: LifecycleObjectType): Promise<DetectedValue[]> {
  const { table, column } = DETECTED_VALUE_SOURCES[objectType];
  const rows = await db
    .select({ value: column, count: sql<number>`count(*)` })
    .from(table)
    .where(isNotNull(column))
    .groupBy(column);

  const mappedRows = await db
    .select({ internalName: lifecycleStage.internalName })
    .from(lifecycleStage)
    .where(eq(lifecycleStage.objectType, objectType));
  const mapped = new Set(mappedRows.map((r) => r.internalName));

  return rows
    .map((r) => ({ internalName: r.value as string, count: Number(r.count), mapped: mapped.has(r.value as string) }))
    .sort((a, b) => b.count - a.count);
}

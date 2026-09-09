import { randomUUID } from 'crypto';
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { deal, partnership, pipeline, pipelineStage } from '../../db/schema';
import { ticketLite } from '../../db/lightTables';
import type {
  CreatePipelineInput,
  CreateStageInput,
  DetectedValue,
  PipelineObjectType,
  PipelineRecord,
  PipelineStageRecord,
  PipelineWithStages,
  UpdatePipelineInput,
  UpdateStageInput,
} from './pipeline.types';

export async function findAllByObjectType(objectType: string): Promise<PipelineWithStages[]> {
  const pipelines = await db
    .select()
    .from(pipeline)
    .where(eq(pipeline.objectType, objectType))
    .orderBy(asc(pipeline.sortOrder));

  if (pipelines.length === 0) return [];

  const stages = await db
    .select()
    .from(pipelineStage)
    .where(
      inArray(
        pipelineStage.pipelineId,
        pipelines.map((p) => p.id),
      ),
    )
    .orderBy(asc(pipelineStage.sortOrder));

  return pipelines.map((p) => ({
    ...p,
    stages: stages.filter((s) => s.pipelineId === p.id),
  }));
}

export async function findById(id: string): Promise<PipelineWithStages | null> {
  const rows = await db.select().from(pipeline).where(eq(pipeline.id, id)).limit(1);
  const found = rows[0];
  if (!found) return null;
  const stages = await db
    .select()
    .from(pipelineStage)
    .where(eq(pipelineStage.pipelineId, id))
    .orderBy(asc(pipelineStage.sortOrder));
  return { ...found, stages };
}

export async function create(input: CreatePipelineInput): Promise<PipelineRecord> {
  const maxRow = await db
    .select({ max: sql<number>`coalesce(max(${pipeline.sortOrder}), -1)` })
    .from(pipeline)
    .where(eq(pipeline.objectType, input.objectType));
  const sortOrder = Number(maxRow[0]?.max ?? -1) + 1;

  const id = randomUUID();
  await db
    .insert(pipeline)
    .values({ id, ...input, sortOrder });
  const rows = await db.select().from(pipeline).where(eq(pipeline.id, id)).limit(1);
  return rows[0];
}

export async function update(id: string, input: UpdatePipelineInput): Promise<PipelineRecord | null> {
  await db
    .update(pipeline)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(pipeline.id, id));
  const rows = await db.select().from(pipeline).where(eq(pipeline.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await db.delete(pipeline).where(eq(pipeline.id, id));
  return result.affectedRows > 0;
}

export async function createStage(pipelineId: string, input: CreateStageInput): Promise<PipelineStageRecord> {
  const maxRow = await db
    .select({ max: sql<number>`coalesce(max(${pipelineStage.sortOrder}), -1)` })
    .from(pipelineStage)
    .where(eq(pipelineStage.pipelineId, pipelineId));
  const sortOrder = Number(maxRow[0]?.max ?? -1) + 1;

  const id = randomUUID();
  await db
    .insert(pipelineStage)
    .values({ id, ...input, pipelineId, sortOrder });
  const rows = await db.select().from(pipelineStage).where(eq(pipelineStage.id, id)).limit(1);
  return rows[0];
}

export async function updateStage(stageId: string, input: UpdateStageInput): Promise<PipelineStageRecord | null> {
  await db
    .update(pipelineStage)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(pipelineStage.id, stageId));
  const rows = await db.select().from(pipelineStage).where(eq(pipelineStage.id, stageId)).limit(1);
  return rows[0] ?? null;
}

export async function removeStage(stageId: string): Promise<boolean> {
  const [result] = await db.delete(pipelineStage).where(eq(pipelineStage.id, stageId));
  return result.affectedRows > 0;
}

export async function reorderStages(pipelineId: string, stageIds: string[]): Promise<void> {
  await Promise.all(
    stageIds.map((stageId, index) =>
      db
        .update(pipelineStage)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(and(eq(pipelineStage.id, stageId), eq(pipelineStage.pipelineId, pipelineId))),
    ),
  );
}

const DETECTED_PIPELINE_SOURCES: Record<PipelineObjectType, { table: any; column: any }> = {
  deals: { table: deal, column: deal.pipeline },
  partnerships: { table: partnership, column: partnership.hsPipeline },
  tickets: { table: ticketLite, column: ticketLite.hsPipeline },
};

const DETECTED_STAGE_SOURCES: Record<PipelineObjectType, { table: any; pipelineColumn: any; stageColumn: any }> = {
  deals: { table: deal, pipelineColumn: deal.pipeline, stageColumn: deal.dealstage },
  partnerships: { table: partnership, pipelineColumn: partnership.hsPipeline, stageColumn: partnership.hsPipelineStage },
  tickets: { table: ticketLite, pipelineColumn: ticketLite.hsPipeline, stageColumn: ticketLite.hsPipelineStage },
};

export async function getDetectedPipelineValues(objectType: PipelineObjectType): Promise<DetectedValue[]> {
  const { table, column } = DETECTED_PIPELINE_SOURCES[objectType];
  const rows = await db
    .select({ value: column, count: sql<number>`count(*)` })
    .from(table)
    .where(isNotNull(column))
    .groupBy(column);

  const mappedRows = await db
    .select({ internalName: pipeline.internalName })
    .from(pipeline)
    .where(eq(pipeline.objectType, objectType));
  const mapped = new Set(mappedRows.map((r) => r.internalName));

  return rows
    .map((r) => ({ internalName: r.value as string, count: Number(r.count), mapped: mapped.has(r.value as string) }))
    .sort((a, b) => b.count - a.count);
}

export async function getDetectedStageValues(objectType: PipelineObjectType, pipelineInternalName: string): Promise<DetectedValue[]> {
  const { table, pipelineColumn, stageColumn } = DETECTED_STAGE_SOURCES[objectType];
  const rows = await db
    .select({ value: stageColumn, count: sql<number>`count(*)` })
    .from(table)
    .where(and(eq(pipelineColumn, pipelineInternalName), isNotNull(stageColumn)))
    .groupBy(stageColumn);

  const pipelineRow = await db.select().from(pipeline).where(eq(pipeline.internalName, pipelineInternalName)).limit(1);
  let mapped = new Set<string>();
  if (pipelineRow[0]) {
    const stageRows = await db
      .select({ internalName: pipelineStage.internalName })
      .from(pipelineStage)
      .where(eq(pipelineStage.pipelineId, pipelineRow[0].id));
    mapped = new Set(stageRows.map((r) => r.internalName));
  }

  return rows
    .map((r) => ({ internalName: r.value as string, count: Number(r.count), mapped: mapped.has(r.value as string) }))
    .sort((a, b) => b.count - a.count);
}

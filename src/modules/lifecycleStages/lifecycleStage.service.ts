import * as repo from './lifecycleStage.repository';
import type { CreateLifecycleStageInput, LifecycleObjectType, UpdateLifecycleStageInput } from './lifecycleStage.types';

function notFound(what: string) {
  const err = new Error(`${what} not found`) as Error & { statusCode?: number };
  err.statusCode = 404;
  return err;
}

export const listStages = (objectType: string) => repo.findAllByObjectType(objectType);

export async function getStage(id: string) {
  const s = await repo.findById(id);
  if (!s) throw notFound('Lifecycle stage');
  return s;
}

export const createStage = (input: CreateLifecycleStageInput) => repo.create(input);

export async function updateStage(id: string, input: UpdateLifecycleStageInput) {
  const s = await repo.update(id, input);
  if (!s) throw notFound('Lifecycle stage');
  return s;
}

export async function deleteStage(id: string) {
  const deleted = await repo.remove(id);
  if (!deleted) throw notFound('Lifecycle stage');
}

export const reorderStages = (objectType: string, stageIds: string[]) => repo.reorder(objectType, stageIds);

export const getDetectedValues = (objectType: LifecycleObjectType) => repo.getDetectedValues(objectType);

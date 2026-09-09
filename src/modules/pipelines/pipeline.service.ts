import * as repo from './pipeline.repository';
import type {
  CreatePipelineInput,
  CreateStageInput,
  PipelineObjectType,
  UpdatePipelineInput,
  UpdateStageInput,
} from './pipeline.types';

function notFound(what: string) {
  const err = new Error(`${what} not found`) as Error & { statusCode?: number };
  err.statusCode = 404;
  return err;
}

export const listPipelines = (objectType: PipelineObjectType) => repo.findAllByObjectType(objectType);

export async function getPipeline(id: string) {
  const p = await repo.findById(id);
  if (!p) throw notFound('Pipeline');
  return p;
}

export const createPipeline = (input: CreatePipelineInput) => repo.create(input);

export async function updatePipeline(id: string, input: UpdatePipelineInput) {
  const p = await repo.update(id, input);
  if (!p) throw notFound('Pipeline');
  return p;
}

export async function deletePipeline(id: string) {
  const deleted = await repo.remove(id);
  if (!deleted) throw notFound('Pipeline');
}

export async function createStage(pipelineId: string, input: CreateStageInput) {
  const p = await repo.findById(pipelineId);
  if (!p) throw notFound('Pipeline');
  return repo.createStage(pipelineId, input);
}

export async function updateStage(stageId: string, input: UpdateStageInput) {
  const s = await repo.updateStage(stageId, input);
  if (!s) throw notFound('Stage');
  return s;
}

export async function deleteStage(stageId: string) {
  const deleted = await repo.removeStage(stageId);
  if (!deleted) throw notFound('Stage');
}

export const reorderStages = (pipelineId: string, stageIds: string[]) => repo.reorderStages(pipelineId, stageIds);

export const getDetectedPipelineValues = (objectType: PipelineObjectType) => repo.getDetectedPipelineValues(objectType);

export async function getDetectedStageValuesForPipeline(pipelineId: string) {
  const p = await repo.findById(pipelineId);
  if (!p) throw notFound('Pipeline');
  return repo.getDetectedStageValues(p.objectType as PipelineObjectType, p.internalName);
}

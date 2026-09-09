import { get, post, put, del } from './client';
import type {
  CreatePipelineInput,
  CreateStageInput,
  DetectedValue,
  Pipeline,
  PipelineObjectType,
  PipelineStage,
  PipelineWithStages,
  UpdatePipelineInput,
  UpdateStageInput,
} from '../types/index';

export const pipelinesApi = {
  list: (objectType: PipelineObjectType) => get<PipelineWithStages[]>(`/pipelines?objectType=${objectType}`),
  getById: (id: string) => get<PipelineWithStages>(`/pipelines/${id}`),
  create: (input: CreatePipelineInput) => post<Pipeline>('/pipelines', input),
  update: (id: string, input: UpdatePipelineInput) => put<Pipeline>(`/pipelines/${id}`, input),
  delete: (id: string) => del(`/pipelines/${id}`),
  getDetectedPipelineValues: (objectType: PipelineObjectType) =>
    get<DetectedValue[]>(`/pipelines/detected-pipelines?objectType=${objectType}`),
  getDetectedStageValues: (pipelineId: string) => get<DetectedValue[]>(`/pipelines/${pipelineId}/detected-stages`),
  createStage: (pipelineId: string, input: CreateStageInput) => post<PipelineStage>(`/pipelines/${pipelineId}/stages`, input),
  updateStage: (pipelineId: string, stageId: string, input: UpdateStageInput) =>
    put<PipelineStage>(`/pipelines/${pipelineId}/stages/${stageId}`, input),
  deleteStage: (pipelineId: string, stageId: string) => del(`/pipelines/${pipelineId}/stages/${stageId}`),
  reorderStages: (pipelineId: string, stageIds: string[]) => put(`/pipelines/${pipelineId}/stages/reorder`, { stageIds }),
};

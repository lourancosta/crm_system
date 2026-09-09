import { get, post, put, del } from './client';
import type {
  CreateLifecycleStageInput,
  DetectedValue,
  LifecycleObjectType,
  LifecycleStage,
  UpdateLifecycleStageInput,
} from '../types/index';

export const lifecycleStagesApi = {
  list: (objectType: LifecycleObjectType) => get<LifecycleStage[]>(`/lifecycle-stages?objectType=${objectType}`),
  create: (input: CreateLifecycleStageInput) => post<LifecycleStage>('/lifecycle-stages', input),
  update: (id: string, input: UpdateLifecycleStageInput) => put<LifecycleStage>(`/lifecycle-stages/${id}`, input),
  delete: (id: string) => del(`/lifecycle-stages/${id}`),
  getDetectedValues: (objectType: LifecycleObjectType) =>
    get<DetectedValue[]>(`/lifecycle-stages/detected-values?objectType=${objectType}`),
  reorder: (objectType: LifecycleObjectType, stageIds: string[]) =>
    put(`/lifecycle-stages/reorder?objectType=${objectType}`, { stageIds }),
};

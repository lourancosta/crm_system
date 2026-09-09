export const PIPELINE_OBJECT_TYPES = ['deals', 'tickets', 'partnerships'] as const;
export type PipelineObjectType = (typeof PIPELINE_OBJECT_TYPES)[number];

export const LIFECYCLE_OBJECT_TYPES = ['contacts', 'companies'] as const;
export type LifecycleObjectType = (typeof LIFECYCLE_OBJECT_TYPES)[number];

export type LifecycleStage = {
  id: string;
  objectType: string;
  externalName: string;
  internalName: string;
  sortOrder: number;
};

export type CreateLifecycleStageInput = {
  objectType: LifecycleObjectType;
  externalName: string;
  internalName: string;
};

export type UpdateLifecycleStageInput = {
  externalName?: string;
  internalName?: string;
};

export type PipelineStage = {
  id: string;
  pipelineId: string;
  externalName: string;
  internalName: string;
  sortOrder: number;
};

export type Pipeline = {
  id: string;
  objectType: string;
  externalName: string;
  internalName: string;
  sortOrder: number;
};

export type PipelineWithStages = Pipeline & {
  stages: PipelineStage[];
};

export type CreatePipelineInput = {
  objectType: PipelineObjectType;
  externalName: string;
  internalName: string;
};

export type UpdatePipelineInput = {
  externalName?: string;
  internalName?: string;
};

export type CreateStageInput = {
  externalName: string;
  internalName: string;
};

export type UpdateStageInput = {
  externalName?: string;
  internalName?: string;
};

export type DetectedValue = {
  internalName: string;
  count: number;
  mapped: boolean;
};

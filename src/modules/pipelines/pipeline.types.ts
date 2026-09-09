// Extend this list when a new object type gains pipeline/stage support.
export const PIPELINE_OBJECT_TYPES = ['deals', 'tickets', 'partnerships'] as const;
export type PipelineObjectType = (typeof PIPELINE_OBJECT_TYPES)[number];

export type PipelineStageRecord = {
  id: string;
  pipelineId: string;
  externalName: string;
  internalName: string;
  sortOrder: number;
};

export type PipelineRecord = {
  id: string;
  objectType: string;
  externalName: string;
  internalName: string;
  sortOrder: number;
};

export type PipelineWithStages = PipelineRecord & {
  stages: PipelineStageRecord[];
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

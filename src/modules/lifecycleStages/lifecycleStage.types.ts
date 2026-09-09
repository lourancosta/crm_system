// Extend this list when a new object type gains lifecycle-stage support.
export const LIFECYCLE_OBJECT_TYPES = ['contacts', 'companies'] as const;
export type LifecycleObjectType = (typeof LIFECYCLE_OBJECT_TYPES)[number];

export type LifecycleStageRecord = {
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

export type DetectedValue = {
  internalName: string;
  count: number;
  mapped: boolean;
};

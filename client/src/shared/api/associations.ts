import { del, post } from './client';
import type { AssociableType } from '../types/index';

type AssociationRef = {
  sourceType: AssociableType;
  sourceId: string;
  targetType: AssociableType;
  targetId: string;
};

export const associationsApi = {
  create: (ref: AssociationRef) => post<{ success: true }>('/associations', ref),
  remove: (ref: AssociationRef) => del<void>(`/associations/${ref.sourceType}/${ref.sourceId}/${ref.targetType}/${ref.targetId}`),
};

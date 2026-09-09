import { del, get, patch, post } from './client';
import type {
  HistoryActivityType,
  HistoryEntry,
  HistoryLoggableObjectType,
  HistoryObjectType,
  LogActivityInput,
} from '../types/index';

export type HistoryPage = {
  entries: HistoryEntry[];
  nextCursor: string | null;
};

export type ListForRecordOptions = {
  cursor?: string;
  limit?: number;
  types?: HistoryActivityType[];
};

export const historyApi = {
  listForRecord: (objectType: HistoryObjectType, objectId: string, options: ListForRecordOptions = {}) => {
    const params = new URLSearchParams();
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.types && options.types.length > 0) params.set('types', options.types.join(','));
    const query = params.toString();
    return get<HistoryPage>(`/history/${objectType}/${objectId}${query ? `?${query}` : ''}`);
  },
  logActivity: (objectType: HistoryObjectType, objectId: string, input: LogActivityInput) =>
    post<void>(`/history/${objectType}/${objectId}`, input),
  updateActivity: (id: string, input: LogActivityInput) => patch<void>(`/history/entry/${id}`, input),
  deleteActivity: (id: string) => del<void>(`/history/entry/${id}`),
  getActivityAssociations: (id: string) =>
    get<{ objectType: HistoryLoggableObjectType; objectId: string }[]>(`/history/entry/${id}/associations`),
};

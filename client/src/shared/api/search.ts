import { get } from './client';
import type { SearchResultGroup } from '../types/index';

export type SearchResponse = {
  query: string;
  groups: SearchResultGroup[];
};

export const searchApi = {
  search: (q: string) => get<SearchResponse>(`/search?q=${encodeURIComponent(q)}`),
};

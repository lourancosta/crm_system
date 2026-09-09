import { del, get, post, put } from '../../../../shared/api/client';
import type { CreateSnippetInput, Snippet, UpdateSnippetInput } from '../../../../shared/types/index';

export const snippetsApi = {
  list: () => get<Snippet[]>('/snippets'),
  create: (input: CreateSnippetInput) => post<Snippet>('/snippets', input),
  update: (id: string, input: UpdateSnippetInput) => put<Snippet>(`/snippets/${id}`, input),
  delete: (id: string) => del(`/snippets/${id}`),
};

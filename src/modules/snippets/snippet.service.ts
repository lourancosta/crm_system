import * as repo from "./snippet.repository";
import type { CreateSnippetInput, UpdateSnippetInput } from "./snippet.types";

function notFound() {
  const error = new Error("Snippet not found") as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

export const listSnippets = () => repo.findAll();

export async function getSnippet(id: string) {
  const found = await repo.findById(id);
  if (!found) throw notFound();
  return found;
}

export const createSnippet = (input: CreateSnippetInput) => repo.create(input);

export async function updateSnippet(id: string, input: UpdateSnippetInput) {
  const updated = await repo.update(id, input);
  if (!updated) throw notFound();
  return updated;
}

export async function deleteSnippet(id: string) {
  const deleted = await repo.remove(id);
  if (!deleted) throw notFound();
}

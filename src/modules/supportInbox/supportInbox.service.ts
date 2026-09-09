import * as repo from './supportInbox.repository';
import type { CreateSupportInboxInput, UpdateSupportInboxInput } from './supportInbox.types';

function notFound() {
  const error = new Error('Support inbox not found') as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

export const listInboxes = () => repo.findAll();

export async function getInbox(id: string) {
  const inbox = await repo.findById(id);
  if (!inbox) throw notFound();
  return inbox;
}

export const createInbox = (input: CreateSupportInboxInput) => repo.create(input);

export async function updateInbox(id: string, input: UpdateSupportInboxInput) {
  const inbox = await repo.update(id, input);
  if (!inbox) throw notFound();
  return inbox;
}

export async function deleteInbox(id: string) {
  const deleted = await repo.remove(id);
  if (!deleted) throw notFound();
}

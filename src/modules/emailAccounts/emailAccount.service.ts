import * as repo from './emailAccount.repository';
import { EMAIL_FEATURES } from './emailAccount.types';
import type { CreateEmailAccountInput, EmailFeature, UpdateEmailAccountInput } from './emailAccount.types';

function notFound() {
  const error = new Error('Email account not found') as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

export const listAccounts = () => repo.findAll();

export async function getAccount(id: string) {
  const account = await repo.findById(id);
  if (!account) throw notFound();
  return account;
}

export const createAccount = (input: CreateEmailAccountInput) => repo.create(input);

export async function updateAccount(id: string, input: UpdateEmailAccountInput) {
  const account = await repo.update(id, input);
  if (!account) throw notFound();
  return account;
}

export async function deleteAccount(id: string) {
  const deleted = await repo.remove(id);
  if (!deleted) throw notFound();
}

export async function getFeatureAssignments() {
  const assignments = await repo.getFeatureAssignments();
  const map = new Map(assignments.map((a) => [a.feature, a.emailAccountId]));
  return EMAIL_FEATURES.map((feature) => ({ feature, emailAccountId: map.get(feature) ?? null }));
}

export const setFeatureAssignment = (feature: EmailFeature, emailAccountId: string | null) =>
  repo.setFeatureAssignment(feature, emailAccountId);

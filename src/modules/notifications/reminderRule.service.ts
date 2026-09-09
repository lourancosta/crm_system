import * as repo from './reminderRule.repository';
import type { CreateReminderRuleInput, UpdateReminderRuleInput } from './reminderRule.types';

function notFound() {
  const err = new Error('Reminder rule not found') as Error & { statusCode?: number };
  err.statusCode = 404;
  return err;
}

export const listReminderRules = (objectType?: string) => repo.findAll(objectType);

export async function getReminderRuleById(id: string) {
  const rule = await repo.findById(id);
  if (!rule) throw notFound();
  return rule;
}

export async function createReminderRule(input: CreateReminderRuleInput) {
  return repo.create(input);
}

export async function updateReminderRule(id: string, input: UpdateReminderRuleInput) {
  const existing = await repo.findById(id);
  if (!existing) throw notFound();
  return repo.update(id, input);
}

export async function deleteReminderRule(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw notFound();
  await repo.remove(id);
}

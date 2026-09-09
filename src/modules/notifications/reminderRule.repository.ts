import { randomUUID } from 'crypto';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { reminderRule } from '../../db/schema';
import type { CreateReminderRuleInput, ReminderRule, UpdateReminderRuleInput } from './reminderRule.types';

export async function findAll(objectType?: string): Promise<ReminderRule[]> {
  return db
    .select()
    .from(reminderRule)
    .where(objectType ? eq(reminderRule.objectType, objectType) : undefined)
    .orderBy(asc(reminderRule.daysBeforeTrigger));
}

export async function findEnabled(objectType: string): Promise<ReminderRule[]> {
  return db
    .select()
    .from(reminderRule)
    .where(and(eq(reminderRule.objectType, objectType), eq(reminderRule.enabled, true)))
    .orderBy(asc(reminderRule.daysBeforeTrigger));
}

export async function findById(id: string): Promise<ReminderRule | null> {
  const rows = await db.select().from(reminderRule).where(eq(reminderRule.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function create(input: CreateReminderRuleInput): Promise<ReminderRule> {
  const id = randomUUID();
  await db.insert(reminderRule).values({ id, ...input });
  const rows = await db.select().from(reminderRule).where(eq(reminderRule.id, id)).limit(1);
  return rows[0];
}

export async function update(id: string, input: UpdateReminderRuleInput): Promise<ReminderRule | null> {
  await db
    .update(reminderRule)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(reminderRule.id, id));
  const rows = await db.select().from(reminderRule).where(eq(reminderRule.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await db.delete(reminderRule).where(eq(reminderRule.id, id));
  return result.affectedRows > 0;
}

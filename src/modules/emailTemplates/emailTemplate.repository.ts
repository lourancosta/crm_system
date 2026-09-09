import { randomUUID } from 'crypto';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { ilike } from '../../lib/sqlHelpers';
import { db } from '../../db/client';
import { emailTemplate } from '../../db/schema';
import type {
  CreateEmailTemplateInput,
  EmailTemplate,
  EmailTemplateObject,
  PaginatedResult,
  UpdateEmailTemplateInput,
} from './emailTemplate.types';

function toEmailTemplate(row: typeof emailTemplate.$inferSelect): EmailTemplate {
  return { ...row, objects: (row.objects as EmailTemplateObject[]) ?? [] };
}

export async function findAll(
  page: number,
  limit: number,
  search?: string,
  object?: EmailTemplateObject,
): Promise<PaginatedResult<EmailTemplate>> {
  const where = and(
    search ? ilike(emailTemplate.name, `%${search}%`) : undefined,
    object ? sql`JSON_CONTAINS(${emailTemplate.objects}, ${JSON.stringify([object])})` : undefined,
  );

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(emailTemplate)
      .where(where)
      .orderBy(desc(emailTemplate.updatedAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(emailTemplate).where(where),
  ]);

  return { data: data.map(toEmailTemplate), total: Number(countResult[0].count), page, limit };
}

export async function findById(id: string): Promise<EmailTemplate | null> {
  const rows = await db.select().from(emailTemplate).where(eq(emailTemplate.id, id)).limit(1);
  return rows[0] ? toEmailTemplate(rows[0]) : null;
}

export async function create(input: CreateEmailTemplateInput): Promise<EmailTemplate> {
  const id = randomUUID();
  await db.insert(emailTemplate).values({ id, ...input });
  const rows = await db.select().from(emailTemplate).where(eq(emailTemplate.id, id)).limit(1);
  return toEmailTemplate(rows[0]);
}

export async function update(id: string, input: UpdateEmailTemplateInput): Promise<EmailTemplate | null> {
  await db
    .update(emailTemplate)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(emailTemplate.id, id));
  const rows = await db.select().from(emailTemplate).where(eq(emailTemplate.id, id)).limit(1);
  return rows[0] ? toEmailTemplate(rows[0]) : null;
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await db.delete(emailTemplate).where(eq(emailTemplate.id, id));
  return result.affectedRows > 0;
}

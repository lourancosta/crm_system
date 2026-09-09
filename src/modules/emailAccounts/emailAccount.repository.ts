import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { emailAccount, emailFeatureSetting } from '../../db/schema';
import { encrypt } from '../../lib/encryption';
import type {
  CreateEmailAccountInput,
  EmailAccount,
  EmailAccountWithSecret,
  EmailFeature,
  UpdateEmailAccountInput,
} from './emailAccount.types';

function toPublic(row: typeof emailAccount.$inferSelect): EmailAccount {
  const { smtpPasswordEncrypted: _secret, ...rest } = row;
  return rest;
}

export async function findAll(): Promise<EmailAccount[]> {
  const rows = await db.select().from(emailAccount).orderBy(emailAccount.name);
  return rows.map(toPublic);
}

export async function findById(id: string): Promise<EmailAccount | null> {
  const rows = await db.select().from(emailAccount).where(eq(emailAccount.id, id)).limit(1);
  return rows[0] ? toPublic(rows[0]) : null;
}

export async function create(input: CreateEmailAccountInput): Promise<EmailAccount> {
  const id = randomUUID();
  await db.insert(emailAccount).values({
    id,
    name: input.name,
    fromName: input.fromName,
    fromEmail: input.fromEmail,
    smtpHost: input.smtpHost,
    smtpPort: input.smtpPort,
    smtpUser: input.smtpUser,
    smtpPasswordEncrypted: encrypt(input.smtpPassword),
  });
  const rows = await db.select().from(emailAccount).where(eq(emailAccount.id, id)).limit(1);
  return toPublic(rows[0]);
}

export async function update(id: string, input: UpdateEmailAccountInput): Promise<EmailAccount | null> {
  const { smtpPassword, ...rest } = input;
  const patch: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (smtpPassword) patch.smtpPasswordEncrypted = encrypt(smtpPassword);

  await db.update(emailAccount).set(patch).where(eq(emailAccount.id, id));
  const rows = await db.select().from(emailAccount).where(eq(emailAccount.id, id)).limit(1);
  return rows[0] ? toPublic(rows[0]) : null;
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await db.delete(emailAccount).where(eq(emailAccount.id, id));
  return result.affectedRows > 0;
}

// Internal-only: includes the encrypted secret, for src/lib/email.ts.
export async function findAccountForFeature(feature: string): Promise<EmailAccountWithSecret | null> {
  const rows = await db
    .select({ account: emailAccount })
    .from(emailFeatureSetting)
    .innerJoin(emailAccount, eq(emailFeatureSetting.emailAccountId, emailAccount.id))
    .where(eq(emailFeatureSetting.feature, feature))
    .limit(1);
  return rows[0]?.account ?? null;
}

export async function getFeatureAssignments(): Promise<{ feature: string; emailAccountId: string | null }[]> {
  return db
    .select({ feature: emailFeatureSetting.feature, emailAccountId: emailFeatureSetting.emailAccountId })
    .from(emailFeatureSetting);
}

export async function setFeatureAssignment(feature: EmailFeature, emailAccountId: string | null): Promise<void> {
  await db
    .insert(emailFeatureSetting)
    .values({ feature, emailAccountId, updatedAt: new Date() })
    .onDuplicateKeyUpdate({
      set: { emailAccountId, updatedAt: new Date() },
    });
}

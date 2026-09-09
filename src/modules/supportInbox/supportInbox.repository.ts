import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { supportInbox } from '../../db/schema';
import { encrypt } from '../../lib/encryption';
import type {
  CreateSupportInboxInput,
  SupportInbox,
  SupportInboxAuthType,
  SupportInboxWithSecret,
  UpdateSupportInboxInput,
} from './supportInbox.types';

function toPublic(row: typeof supportInbox.$inferSelect): SupportInbox {
  const { imapPasswordEncrypted: _pw, msClientSecretEncrypted: _secret, ...rest } = row;
  return { ...rest, authType: rest.authType as SupportInboxAuthType };
}

function toWithSecret(row: typeof supportInbox.$inferSelect): SupportInboxWithSecret {
  return { ...row, authType: row.authType as SupportInboxAuthType };
}

export async function findAll(): Promise<SupportInbox[]> {
  const rows = await db.select().from(supportInbox).orderBy(supportInbox.name);
  return rows.map(toPublic);
}

export async function findById(id: string): Promise<SupportInbox | null> {
  const rows = await db.select().from(supportInbox).where(eq(supportInbox.id, id)).limit(1);
  return rows[0] ? toPublic(rows[0]) : null;
}

// Internal-only: includes the encrypted secrets, for the IMAP polling cron.
export async function findAllEnabledWithSecret(): Promise<SupportInboxWithSecret[]> {
  const rows = await db.select().from(supportInbox).where(eq(supportInbox.enabled, true));
  return rows.map(toWithSecret);
}

// Internal-only: includes the encrypted secrets, for sending ticket replies.
export async function findByIdWithSecret(id: string): Promise<SupportInboxWithSecret | null> {
  const rows = await db.select().from(supportInbox).where(eq(supportInbox.id, id)).limit(1);
  return rows[0] ? toWithSecret(rows[0]) : null;
}

export async function create(input: CreateSupportInboxInput): Promise<SupportInbox> {
  const id = randomUUID();
  await db
    .insert(supportInbox)
    .values({
      id,
      name: input.name,
      imapHost: input.imapHost,
      imapPort: input.imapPort,
      imapSecure: input.imapSecure,
      imapUser: input.imapUser,
      authType: input.authType,
      imapPasswordEncrypted: input.imapPassword ? encrypt(input.imapPassword) : null,
      msTenantId: input.msTenantId ?? null,
      msClientId: input.msClientId ?? null,
      msClientSecretEncrypted: input.msClientSecret ? encrypt(input.msClientSecret) : null,
      smtpHost: input.smtpHost ?? null,
      smtpPort: input.smtpPort ?? null,
      folder: input.folder,
      pipelineId: input.pipelineId,
      defaultStageId: input.defaultStageId,
      enabled: input.enabled,
    });
  const rows = await db.select().from(supportInbox).where(eq(supportInbox.id, id)).limit(1);
  return toPublic(rows[0]);
}

export async function update(id: string, input: UpdateSupportInboxInput): Promise<SupportInbox | null> {
  const { imapPassword, msClientSecret, ...rest } = input;
  const patch: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (imapPassword) patch.imapPasswordEncrypted = encrypt(imapPassword);
  if (msClientSecret) patch.msClientSecretEncrypted = encrypt(msClientSecret);

  await db.update(supportInbox).set(patch).where(eq(supportInbox.id, id));
  const rows = await db.select().from(supportInbox).where(eq(supportInbox.id, id)).limit(1);
  return rows[0] ? toPublic(rows[0]) : null;
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await db.delete(supportInbox).where(eq(supportInbox.id, id));
  return result.affectedRows > 0;
}

export async function updateLastUid(id: string, lastUid: number): Promise<void> {
  await db.update(supportInbox).set({ lastUid, updatedAt: new Date() }).where(eq(supportInbox.id, id));
}

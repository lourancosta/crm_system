import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { googleStorageSettings } from '../../db/schema';
import { decrypt, encrypt } from '../../lib/encryption';
import type {
  GoogleStorageCredentials,
  GoogleStorageSettings,
  UpdateGoogleStorageSettingsInput,
} from './googleStorageSettings.types';

const SETTINGS_ID = 'default';

const EMPTY: GoogleStorageSettings = {
  projectId: null,
  publicBucket: null,
  privateBucket: null,
  publicUrl: null,
  hasServiceAccountKey: false,
};

function toPublic(row: typeof googleStorageSettings.$inferSelect): GoogleStorageSettings {
  return {
    projectId: row.projectId,
    publicBucket: row.publicBucket,
    privateBucket: row.privateBucket,
    publicUrl: row.publicUrl,
    hasServiceAccountKey: row.serviceAccountKeyEncrypted != null,
  };
}

export async function getGoogleStorageSettings(): Promise<GoogleStorageSettings> {
  const rows = await db
    .select()
    .from(googleStorageSettings)
    .where(eq(googleStorageSettings.id, SETTINGS_ID))
    .limit(1);
  return rows[0] ? toPublic(rows[0]) : EMPTY;
}

export async function setGoogleStorageSettings(
  input: UpdateGoogleStorageSettingsInput,
): Promise<GoogleStorageSettings> {
  const { serviceAccountKey, ...rest } = input;
  const patch: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (serviceAccountKey) patch.serviceAccountKeyEncrypted = encrypt(serviceAccountKey);

  await db
    .insert(googleStorageSettings)
    .values({ id: SETTINGS_ID, ...patch })
    .onDuplicateKeyUpdate({ set: patch });
  const rows = await db
    .select()
    .from(googleStorageSettings)
    .where(eq(googleStorageSettings.id, SETTINGS_ID))
    .limit(1);
  return toPublic(rows[0]);
}

// Internal-only: includes the decrypted credential, for src/lib/storage.ts.
export async function getGoogleStorageCredentials(): Promise<GoogleStorageCredentials> {
  const rows = await db
    .select()
    .from(googleStorageSettings)
    .where(eq(googleStorageSettings.id, SETTINGS_ID))
    .limit(1);
  const row = rows[0];
  if (!row) return { projectId: null, publicBucket: null, privateBucket: null, publicUrl: null, credentials: null };

  return {
    projectId: row.projectId,
    publicBucket: row.publicBucket,
    privateBucket: row.privateBucket,
    publicUrl: row.publicUrl,
    credentials: row.serviceAccountKeyEncrypted ? JSON.parse(decrypt(row.serviceAccountKeyEncrypted)) : null,
  };
}

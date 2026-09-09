import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { quoteSettings } from '../../db/schema';

const SETTINGS_ID = 'default';

export async function getQuoteSettings(): Promise<{ defaultExpirationDays: number }> {
  const rows = await db
    .select({ defaultExpirationDays: quoteSettings.defaultExpirationDays })
    .from(quoteSettings)
    .where(eq(quoteSettings.id, SETTINGS_ID))
    .limit(1);
  // Falls back to 30 if the seed row is somehow missing.
  return rows[0] ?? { defaultExpirationDays: 30 };
}

export async function setQuoteSettings(defaultExpirationDays: number): Promise<{ defaultExpirationDays: number }> {
  await db
    .insert(quoteSettings)
    .values({ id: SETTINGS_ID, defaultExpirationDays, updatedAt: new Date() })
    .onDuplicateKeyUpdate({
      set: { defaultExpirationDays, updatedAt: new Date() },
    });
  const rows = await db
    .select({ defaultExpirationDays: quoteSettings.defaultExpirationDays })
    .from(quoteSettings)
    .where(eq(quoteSettings.id, SETTINGS_ID))
    .limit(1);
  return rows[0];
}

export async function getDefaultSignerUserId(): Promise<string | null> {
  const rows = await db
    .select({ defaultSignerUserId: quoteSettings.defaultSignerUserId })
    .from(quoteSettings)
    .where(eq(quoteSettings.id, SETTINGS_ID))
    .limit(1);
  return rows[0]?.defaultSignerUserId ?? null;
}

export async function setDefaultSignerUserId(userId: string | null): Promise<string | null> {
  await db
    .insert(quoteSettings)
    .values({ id: SETTINGS_ID, defaultSignerUserId: userId, updatedAt: new Date() })
    .onDuplicateKeyUpdate({
      set: { defaultSignerUserId: userId, updatedAt: new Date() },
    });
  const rows = await db
    .select({ defaultSignerUserId: quoteSettings.defaultSignerUserId })
    .from(quoteSettings)
    .where(eq(quoteSettings.id, SETTINGS_ID))
    .limit(1);
  return rows[0]?.defaultSignerUserId ?? null;
}

import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { passwordResetToken, users } from '../../db/schema';
import type { UpdateMeInput, User } from './auth.types';

const publicColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  role: users.role,
  accountType: users.accountType,
  companyId: users.companyId,
  permissionSetId: users.permissionSetId,
  jobTitle: users.jobTitle,
  phone: users.phone,
  defaultLandingPage: users.defaultLandingPage,
  avatarKey: users.avatarKey,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

export async function findByEmail(email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<User | null> {
  const rows = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
  return (rows[0] as User | undefined) ?? null;
}

export async function updateSelf(id: string, data: UpdateMeInput): Promise<User | null> {
  await db
    .update(users)
    .set({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
      defaultLandingPage: data.defaultLandingPage,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
  const rows = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
  return (rows[0] as User | undefined) ?? null;
}

export async function updateAvatarKey(id: string, avatarKey: string): Promise<User | null> {
  await db
    .update(users)
    .set({ avatarKey, updatedAt: new Date() })
    .where(eq(users.id, id));
  const rows = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
  return (rows[0] as User | undefined) ?? null;
}

export async function invalidateResetTokensForUser(userId: string): Promise<void> {
  await db
    .update(passwordResetToken)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetToken.userId, userId), isNull(passwordResetToken.usedAt)));
}

export async function createResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  await db.insert(passwordResetToken).values({ userId, tokenHash, expiresAt });
}

export async function findValidResetToken(tokenHash: string) {
  const rows = await db
    .select()
    .from(passwordResetToken)
    .where(
      and(
        eq(passwordResetToken.tokenHash, tokenHash),
        isNull(passwordResetToken.usedAt),
        gt(passwordResetToken.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function markResetTokenUsed(id: string): Promise<void> {
  await db.update(passwordResetToken).set({ usedAt: new Date() }).where(eq(passwordResetToken.id, id));
}

export async function updatePassword(userId: string, passwordHash: string): Promise<void> {
  const now = new Date();
  await db.update(users).set({ passwordHash, passwordSetAt: now, updatedAt: now }).where(eq(users.id, userId));
}

export async function findPasswordHashById(id: string): Promise<string | null> {
  const rows = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, id)).limit(1);
  return rows[0]?.passwordHash ?? null;
}

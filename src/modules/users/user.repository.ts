import { randomUUID } from 'crypto';
import { and, asc, count, eq, ne, or } from 'drizzle-orm';
import { ilike } from '../../lib/sqlHelpers';
import { db } from '../../db/client';
import { users } from '../../db/schema';
import { SYSTEM_USER_ID } from './user.types';
import type { CreateUserInput, UserRecord } from './user.types';

const publicColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  role: users.role,
  accountType: users.accountType,
  companyId: users.companyId,
  hubspotOwnerId: users.hubspotOwnerId,
  permissionSetId: users.permissionSetId,
  jobTitle: users.jobTitle,
  phone: users.phone,
  passwordSetAt: users.passwordSetAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

// company-scoped callers (partner_admin/customer_admin) only ever see peers
// in their own accountType + company — never just companyId alone, so a
// partner admin can never see an internal user even in an edge case where
// companyId happened to collide.
export type CompanyRestriction = { accountType: string; companyId: string };

export async function findAll(
  params: { page: number; limit: number; search: string },
  restrictTo?: CompanyRestriction,
): Promise<{ data: UserRecord[]; total: number }> {
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  const baseFilter = restrictTo
    ? and(eq(users.accountType, restrictTo.accountType), eq(users.companyId, restrictTo.companyId))
    : ne(users.id, SYSTEM_USER_ID);

  const filter = search
    ? and(
        baseFilter,
        or(ilike(users.firstName, `%${search}%`), ilike(users.lastName, `%${search}%`), ilike(users.email, `%${search}%`)),
      )
    : baseFilter;

  const [data, totalRows] = await Promise.all([
    db.select(publicColumns).from(users).where(filter).orderBy(asc(users.firstName), asc(users.lastName)).limit(limit).offset(offset),
    db.select({ count: count() }).from(users).where(filter),
  ]);

  return { data: data as UserRecord[], total: Number(totalRows[0].count) };
}

// Unpaginated, minimal-fields list for admin pickers (e.g. Settings > Objects
// > Quote > Signature's "default countersigner" dropdown) — distinct from
// findAll's paginated/searchable table listing.
export async function findInternalUsers(): Promise<Pick<UserRecord, 'id' | 'firstName' | 'lastName' | 'email'>[]> {
  return db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users)
    .where(and(eq(users.accountType, 'internal'), ne(users.id, SYSTEM_USER_ID)))
    .orderBy(asc(users.firstName), asc(users.lastName));
}

export async function findById(id: string): Promise<UserRecord | null> {
  const rows = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
  return (rows[0] as UserRecord | undefined) ?? null;
}

export async function findByEmail(email: string): Promise<UserRecord | null> {
  const rows = await db.select(publicColumns).from(users).where(eq(users.email, email)).limit(1);
  return (rows[0] as UserRecord | undefined) ?? null;
}

// Deliberately separate from publicColumns (which never selects avatarKey) —
// only the avatar-streaming route needs the raw GCS key, not the general
// list/get endpoints.
export async function findAvatarKey(id: string): Promise<{ avatarKey: string | null } | null> {
  const rows = await db.select({ avatarKey: users.avatarKey }).from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function create(input: CreateUserInput & { passwordHash: string }): Promise<UserRecord> {
  const id = randomUUID();
  await db
    .insert(users)
    .values({
      id,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash: input.passwordHash,
      accountType: input.accountType,
      role: input.role ?? 'admin',
      companyId: input.companyId ?? null,
      permissionSetId: input.permissionSetId ?? null,
      jobTitle: input.jobTitle ?? null,
      phone: input.phone ?? null,
    });
  const rows = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
  return rows[0] as UserRecord;
}

export async function update(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    accountType?: string;
    passwordHash?: string;
    companyId?: string | null;
    hubspotOwnerId?: string | null;
    permissionSetId?: string | null;
    jobTitle?: string | null;
    phone?: string | null;
  },
): Promise<UserRecord | null> {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.accountType !== undefined) updateData.accountType = data.accountType;
  if (data.passwordHash !== undefined) {
    updateData.passwordHash = data.passwordHash;
    // An admin manually setting a password also counts as "set" — clears the
    // pending-invite state so Resend Invite stops showing for this user.
    updateData.passwordSetAt = new Date();
  }
  if (data.companyId !== undefined) updateData.companyId = data.companyId;
  if (data.hubspotOwnerId !== undefined) updateData.hubspotOwnerId = data.hubspotOwnerId;
  if (data.permissionSetId !== undefined) updateData.permissionSetId = data.permissionSetId;
  if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
  if (data.phone !== undefined) updateData.phone = data.phone;

  await db.update(users).set(updateData).where(eq(users.id, id));
  const rows = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
  return (rows[0] as UserRecord | undefined) ?? null;
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await db.delete(users).where(eq(users.id, id));
  return result.affectedRows > 0;
}

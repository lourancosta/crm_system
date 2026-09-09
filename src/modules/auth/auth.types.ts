import type { AccountType } from '../../lib/permissions';

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accountType: AccountType;
  companyId: string | null;
  permissionSetId: string | null;
  jobTitle: string | null;
  phone: string | null;
  defaultLandingPage: string;
  // GCS private-bucket object key, never sent to the client directly —
  // resolved to an avatarUrl (GET /api/auth/me/avatar) on UserWithGrants instead.
  avatarKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Resolved once per /me (and login) response so the frontend can hide the
// Users & Permission settings nav item for non-admins without a second
// round-trip — 'view' access to the 'users' module is what actually gates
// that page's data via requireModule, this just mirrors that for the nav.
export type UserWithGrants = Omit<User, 'avatarKey'> & { canManageUsers: boolean; avatarUrl: string | null };

export type UpdateMeInput = {
  firstName: string;
  lastName: string;
  phone?: string | null;
  defaultLandingPage: string;
};

export type LoginDTO = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: UserWithGrants;
  token: string;
};

export type JwtPayload = {
  sub: string;
  email: string;
  accountType: AccountType;
  role: string;
  companyId: string | null;
};

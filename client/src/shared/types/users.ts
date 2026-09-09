import type { AccountType } from './permissions';

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
  passwordSetAt: string | null;
  defaultLandingPage: string;
  // Resolved server-side from the caller's 'users' module grant — internal
  // admins only; gates the Users & Permission settings nav item.
  canManageUsers: boolean;
  // GET /api/auth/me/avatar (already cache-busted with a ?v= query param) —
  // null until the user uploads a profile photo. Requires the Bearer token,
  // so it can't be dropped straight into an <img src>; see privateMedia.ts.
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateMeInput = {
  firstName: string;
  lastName: string;
  phone?: string | null;
  defaultLandingPage: string;
};

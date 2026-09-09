import type { AccountType } from '../../lib/permissions';

// Seeded row (see migration) used to attribute actions not performed by a
// logged-in user — e.g. the HubSpot sync, or automated jobs. Not a real
// login account: excluded from user management and can't be edited/deleted.
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export type UserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accountType: AccountType;
  companyId: string | null;
  hubspotOwnerId: string | null;
  permissionSetId: string | null;
  jobTitle: string | null;
  phone: string | null;
  passwordSetAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  accountType?: AccountType;
  role?: string;
  password?: string;
  companyId?: string | null;
  hubspotOwnerId?: string | null;
  permissionSetId?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
};

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  accountType: AccountType;
  role?: string;
  companyId?: string;
  permissionSetId?: string;
  jobTitle?: string;
  phone?: string;
};

export type CallerContext = {
  accountType: AccountType;
  companyId: string | null;
};

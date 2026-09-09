// Single source of truth for access control across internal/partner/customer
// logins. Two tracks resolve to the same ModulePermission shape:
//  - internal: DB-backed, per user's assigned permission set
//    (src/modules/permissionSets) — looked up fresh per request so an admin
//    changing a permission set takes effect without forcing re-login.
//  - partner/customer: fixed, hardcoded below — a small set of named roles,
//    delete/merge are always 'none' (partner/customer can never delete).

export const ACCOUNT_TYPES = ['internal', 'partner', 'customer'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const PORTAL_ROLES = [
  'partner_admin',
  'partner_user',
  'partner_billing',
  'customer_admin',
  'customer_user',
] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

// "Record" modules covered by the view/create/edit/delete/merge matrix.
// Knowledge base is deliberately excluded — it's gated by KB_TIER_RANK below,
// not this action matrix. System-config modules (pipelines, email
// accounts/templates, support inboxes, reminder rules, dashboard, history)
// are internal-only and gated by requireInternal, not this matrix either.
export const MODULES = [
  'contacts',
  'companies',
  'deals',
  'tickets',
  'invoices',
  'quotes',
  'licenses',
  'partnerships',
  'products',
  'payments',
  'creditMemos',
  'users',
] as const;
export type Module = (typeof MODULES)[number];

// A user's personal "default landing page" (Settings > Your Preferences >
// General > Profile) can be any record module they might have access to,
// plus the dashboard itself — kept in sync with MODULES minus 'users' (not
// a landing page).
export const LANDING_PAGE_OPTIONS = ['dashboard', ...MODULES.filter((m) => m !== 'users')] as const;
export type LandingPageOption = (typeof LANDING_PAGE_OPTIONS)[number];

export type Scope = 'none' | 'own' | 'all';

export type ModulePermission = {
  view: Scope;
  create: boolean;
  edit: Scope;
  delete: Scope;
  merge: Scope; // stored/surfaced in the admin UI, not enforced — no merge feature exists yet.
};

export const NO_ACCESS: ModulePermission = {
  view: 'none',
  create: false,
  edit: 'none',
  delete: 'none',
  merge: 'none',
};

// Partner/customer never delete or merge, regardless of role — enforced here
// once so it can't be loosened by accident in an individual role's entry.
function portal(partial: Omit<ModulePermission, 'delete' | 'merge'>): ModulePermission {
  return { ...partial, delete: 'none', merge: 'none' };
}

// 'all' for a partner/customer role always means "everyone in their own
// company" — resolved via the same dynamicAssociation join already used for
// e.g. findAssociatedCompanies, scoped to the caller's companyId. It never
// means cross-company.
export const PORTAL_ROLE_PERMISSIONS: Record<PortalRole, Partial<Record<Module, ModulePermission>>> = {
  partner_admin: {
    deals: portal({ view: 'all', create: true, edit: 'all' }),
    tickets: portal({ view: 'all', create: true, edit: 'all' }),
    invoices: portal({ view: 'all', create: false, edit: 'none' }),
    users: portal({ view: 'all', create: true, edit: 'all' }),
  },
  partner_user: {
    deals: portal({ view: 'own', create: true, edit: 'own' }),
    tickets: portal({ view: 'own', create: true, edit: 'own' }),
  },
  partner_billing: {
    tickets: portal({ view: 'own', create: true, edit: 'own' }),
    invoices: portal({ view: 'all', create: false, edit: 'none' }),
  },
  customer_admin: {
    tickets: portal({ view: 'all', create: true, edit: 'all' }),
    users: portal({ view: 'all', create: true, edit: 'all' }),
  },
  customer_user: {
    tickets: portal({ view: 'own', create: true, edit: 'own' }),
  },
};

export function getPortalPermission(role: string, module: Module): ModulePermission {
  const rolePerms = PORTAL_ROLE_PERMISSIONS[role as PortalRole];
  return rolePerms?.[module] ?? NO_ACCESS;
}

// Knowledge base: a hierarchical tier, not a per-action matrix — anyone at a
// tier or higher sees content authored at or below their tier.
export const KB_TIERS = ['public', 'customer', 'partner', 'internal'] as const;
export type KbTier = (typeof KB_TIERS)[number];

export const KB_TIER_RANK: Record<KbTier, number> = {
  public: 0,
  customer: 1,
  partner: 2,
  internal: 3,
};

export function kbTierForAccountType(accountType: AccountType | undefined): KbTier {
  if (accountType === 'internal') return 'internal';
  if (accountType === 'partner') return 'partner';
  if (accountType === 'customer') return 'customer';
  return 'public';
}

export function canViewKbTier(callerTier: KbTier, articleTier: KbTier): boolean {
  return KB_TIER_RANK[callerTier] >= KB_TIER_RANK[articleTier];
}

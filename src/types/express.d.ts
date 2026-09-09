import type { AccountType, ModulePermission } from '../lib/permissions';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string; accountType: AccountType; role: string; companyId: string | null };
      // Attached by requireModule — the caller's resolved grant for the
      // module the route is guarding, plus ownerKey for 'own'-scope filtering
      // (a hubspotOwnerId for internal users, req.user.userId for portal
      // users — see src/middlewares/authorize.ts).
      scope?: ModulePermission & { ownerKey: string | null };
    }
  }
}

export {};

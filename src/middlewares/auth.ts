import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../modules/auth/auth.service';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    const error = new Error('Authentication required') as Error & { statusCode: number };
    error.statusCode = 401;
    return next(error);
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    req.user = {
      userId: payload.sub,
      email: payload.email,
      accountType: payload.accountType,
      role: payload.role,
      companyId: payload.companyId,
    };
    next();
  } catch (error) {
    next(error);
  }
}

// For routes that must stay reachable by anonymous callers (e.g. the public
// KB portal) but still need to know the real caller identity when a session
// exists - verifies a Bearer token if one is present, but never rejects the
// request when it's missing or invalid. Route handlers must not trust any
// client-supplied substitute for the tier/identity this sets on req.user.
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  try {
    const payload = verifyToken(authHeader.slice(7));
    req.user = {
      userId: payload.sub,
      email: payload.email,
      accountType: payload.accountType,
      role: payload.role,
      companyId: payload.companyId,
    };
  } catch {
    // invalid/expired token on an optional-auth route - proceed anonymously
  }
  next();
}

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import * as authRepository from './auth.repository';
import { getInternalGrant } from '../../middlewares/authorize';
import { getPortalPermission } from '../../lib/permissions';
import { sendEmail } from '../../lib/email';
import type { LoginDTO, AuthResponse, JwtPayload, UpdateMeInput, User, UserWithGrants } from './auth.types';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

// Was previously a console.warn-and-continue: a missing APP_BASE_URL still
// built and sent the reset email with a bare "/reset-password?token=..."
// href. A relative link like that has no page origin to resolve against
// once it's opened from an email client (not a real page) — mail clients
// fall back to a synthetic per-message base (e.g. Apple Mail's
// "x-webdoc://<uuid>/"), so the link silently 404s/does-nothing for the
// user with no server-side signal anything went wrong. Failing loudly here
// instead means a misconfigured environment sends no email at all (a user
// can retry) rather than a guaranteed-broken one.
export function getAppBaseUrl(): string {
  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) throw new Error('APP_BASE_URL environment variable is not set — cannot build an absolute reset-password link');
  return baseUrl;
}

function generateToken(user: Pick<User, 'id' | 'email' | 'accountType' | 'role' | 'companyId'>): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    accountType: user.accountType,
    role: user.role,
    companyId: user.companyId,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

function notFound(message: string): never {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 404;
  throw error;
}

function unauthorized(message: string): never {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 401;
  throw error;
}

function badRequest(message: string): never {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 400;
  throw error;
}

// Exported so user.service.ts's invite flow can reuse the exact same hashing
// scheme when issuing its own password_reset_tokens rows.
export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// 'view' access to the 'users' module is the same check requireModule('users',
// 'view') enforces on the actual data routes — resolved here too so the
// frontend can hide the Users & Permission nav item for non-admins.
async function resolveCanManageUsers(user: Pick<User, 'id' | 'accountType' | 'role'>): Promise<boolean> {
  if (user.accountType === 'internal') {
    const grant = await getInternalGrant(user.id, 'users');
    return grant.permission.view !== 'none';
  }
  return getPortalPermission(user.role, 'users').view !== 'none';
}

async function withGrants(user: User): Promise<UserWithGrants> {
  const canManageUsers = await resolveCanManageUsers(user);
  const { avatarKey, ...rest } = user;
  // Cache-busted with updatedAt so a re-upload (which bumps it) is never
  // served stale from the browser's own image cache.
  const avatarUrl = avatarKey ? `/api/auth/me/avatar?v=${user.updatedAt.getTime()}` : null;
  return { ...rest, avatarUrl, canManageUsers };
}

export async function login(data: LoginDTO): Promise<AuthResponse> {
  const row = await authRepository.findByEmail(data.email);
  if (!row) unauthorized('Invalid email or password');

  const { passwordHash, ...user } = row;
  const valid = await bcrypt.compare(data.password, passwordHash);
  if (!valid) unauthorized('Invalid email or password');

  const token = generateToken(user as User);
  return { user: await withGrants(user as User), token };
}

export async function requestPasswordReset(email: string): Promise<void> {
  try {
    const user = await authRepository.findByEmail(email);
    if (!user) return;

    await authRepository.invalidateResetTokensForUser(user.id);

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await authRepository.createResetToken(user.id, tokenHash, expiresAt);

    const resetUrl = `${getAppBaseUrl()}/reset-password?token=${rawToken}`;

    await sendEmail({
      feature: 'password_reset',
      to: [user.email],
      subject: 'Reset your password',
      html: `
        <p>We received a request to reset your password.</p>
        <p><a href="${resetUrl}">Click here to choose a new password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  } catch (error) {
    console.error('Failed to process password reset request:', error);
  }
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashResetToken(rawToken);
  const record = await authRepository.findValidResetToken(tokenHash);
  if (!record) badRequest('This reset link is invalid or has expired.');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await authRepository.updatePassword(record.userId, passwordHash);
  await authRepository.markResetTokenUsed(record.id);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const passwordHash = await authRepository.findPasswordHashById(userId);
  if (!passwordHash) notFound('User not found');

  const valid = await bcrypt.compare(currentPassword, passwordHash);
  if (!valid) badRequest('Current password is incorrect.');

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await authRepository.updatePassword(userId, newPasswordHash);
}

export async function getMe(userId: string): Promise<UserWithGrants> {
  const user = await authRepository.findById(userId);
  if (!user) notFound('User not found');
  return withGrants(user);
}

export async function updateMe(userId: string, data: UpdateMeInput): Promise<UserWithGrants> {
  const user = await authRepository.updateSelf(userId, data);
  if (!user) notFound('User not found');
  return withGrants(user);
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    unauthorized('Invalid or expired token');
  }
}

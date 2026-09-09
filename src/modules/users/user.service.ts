import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as repo from './user.repository';
import { SYSTEM_USER_ID } from './user.types';
import type { CallerContext, CreateUserInput, UpdateUserInput, UserRecord } from './user.types';
import * as authRepository from '../auth/auth.repository';
import { getAppBaseUrl, hashResetToken } from '../auth/auth.service';
import { sendEmail } from '../../lib/email';

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function notFound() {
  const err = new Error('User not found');
  (err as any).statusCode = 404;
  return err;
}

function badRequest(message: string) {
  const err = new Error(message);
  (err as any).statusCode = 400;
  return err;
}

function systemUserProtected() {
  const err = new Error('The System account cannot be edited or deleted');
  (err as any).statusCode = 403;
  return err;
}

function forbidden(message: string) {
  const err = new Error(message);
  (err as any).statusCode = 403;
  return err;
}

function conflict(message: string) {
  const err = new Error(message);
  (err as any).statusCode = 409;
  return err;
}

// Company-scoped callers (partner_admin/customer_admin) never get an
// unrestricted list/lookup — internal callers with users:view='all' do.
function restrictionFor(caller: CallerContext) {
  return caller.accountType === 'internal' ? undefined : { accountType: caller.accountType, companyId: caller.companyId ?? '' };
}

export async function listUsers(params: { page: number; limit: number; search: string }, caller: CallerContext) {
  return repo.findAll(params, restrictionFor(caller));
}

export async function listInternalUsers() {
  return repo.findInternalUsers();
}

export async function getUserById(id: string, caller: CallerContext) {
  const user = await repo.findById(id);
  if (!user) throw notFound();
  if (caller.accountType !== 'internal' && (user.accountType !== caller.accountType || user.companyId !== caller.companyId)) {
    throw notFound();
  }
  return user;
}

export async function createUser(input: CreateUserInput, caller: CallerContext) {
  if (caller.accountType !== 'internal') {
    if (input.accountType !== caller.accountType) throw forbidden('Cannot create a user outside your own account type');
    if (input.companyId !== caller.companyId) throw forbidden('Cannot create a user outside your own company');
  }

  const existing = await repo.findByEmail(input.email);
  if (existing) throw conflict('Email already in use');

  // No password is set at creation — the user is emailed an invite link and
  // sets their own. This placeholder is never a valid bcrypt match for any
  // input, so login safely fails (401) until the invite is accepted.
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const user = await repo.create({ ...input, passwordHash });
  const inviteSent = await sendUserInvite(user);
  return { ...user, inviteSent };
}

async function sendUserInvite(user: UserRecord): Promise<boolean> {
  try {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);
    await authRepository.createResetToken(user.id, tokenHash, expiresAt);

    const inviteUrl = `${getAppBaseUrl()}/reset-password?token=${rawToken}&invite=1`;

    await sendEmail({
      feature: 'user_invite',
      to: [user.email],
      subject: "You're invited to CRM System",
      html: `
        <p>Hi ${user.firstName},</p>
        <p>An account was created for you on CRM System. Click below to set your password and get started.</p>
        <p><a href="${inviteUrl}">Set your password</a></p>
        <p>This link expires in 7 days. If you weren't expecting this, you can safely ignore this email.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send user invite:', error);
    return false;
  }
}

export async function resendInvite(id: string, caller: CallerContext) {
  const user = await getUserById(id, caller); // enforces the company-scope boundary
  if (user.passwordSetAt) throw badRequest('This user has already set their password.');

  await authRepository.invalidateResetTokensForUser(id);
  const inviteSent = await sendUserInvite(user);
  return { inviteSent };
}

export async function updateUser(id: string, data: UpdateUserInput, caller: CallerContext) {
  if (id === SYSTEM_USER_ID) throw systemUserProtected();
  const existing = await getUserById(id, caller); // also enforces the company-scope boundary

  if (caller.accountType !== 'internal' && (data.permissionSetId !== undefined || existing.accountType === 'internal')) {
    throw forbidden('Not permitted to modify this user');
  }

  const patch: {
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
  } = {};
  if (data.firstName) patch.firstName = data.firstName;
  if (data.lastName) patch.lastName = data.lastName;
  if (data.email) patch.email = data.email;
  if (data.role) patch.role = data.role;
  if (data.password) patch.passwordHash = await bcrypt.hash(data.password, 10);
  if (data.jobTitle !== undefined) patch.jobTitle = data.jobTitle;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (caller.accountType === 'internal') {
    if (data.accountType) patch.accountType = data.accountType;
    if (data.companyId !== undefined) patch.companyId = data.companyId;
    if (data.hubspotOwnerId !== undefined) patch.hubspotOwnerId = data.hubspotOwnerId;
    if (data.permissionSetId !== undefined) patch.permissionSetId = data.permissionSetId;
  }

  return repo.update(id, patch);
}

export async function deleteUser(id: string, caller: CallerContext) {
  if (id === SYSTEM_USER_ID) throw systemUserProtected();
  await getUserById(id, caller); // enforces the company-scope boundary
  await repo.remove(id);
}

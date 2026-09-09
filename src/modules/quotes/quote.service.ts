import crypto from 'crypto';
import * as quoteRepository from './quote.repository';
import * as userRepository from '../users/user.repository';
import { getDefaultSignerUserId, getQuoteSettings } from './quoteSettings.repository';
import { getDealById } from '../deals/deal.service';
import { getCompanyById } from '../companies/company.service';
import { getContactById } from '../contacts/contact.service';
import { sendEmail } from '../../lib/email';
import { getAppBaseUrl, hashResetToken } from '../auth/auth.service';
import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { UpdateQuoteDetailsInput, UpdateQuoteSenderInput } from './quote.repository';
import type {
  CreateLineItemInput,
  CreateQuoteDiscountInput,
  SubmitSignatureInput,
  UpdateLineItemInput,
  UpdateQuoteDiscountInput,
} from './quote.types';

const SIGNER_TOKEN_FALLBACK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function notFound() {
  const error = new Error('Quote not found') as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

function missingHubspotId(entity: string) {
  const err = new Error(`${entity} is missing an external ID and cannot be linked to a quote`) as Error & { statusCode?: number };
  err.statusCode = 422;
  return err;
}

function conflict(message: string) {
  const err = new Error(message) as Error & { statusCode?: number };
  err.statusCode = 409;
  return err;
}

function forbidden(message: string) {
  const err = new Error(message) as Error & { statusCode?: number };
  err.statusCode = 403;
  return err;
}

async function requireQuoteInScope(id: string, scope?: RecordAccessScope) {
  const q = await quoteRepository.findById(id, scope);
  if (!q) throw notFound();
  return q;
}

export async function getQuotes(page: number, limit: number, search?: string, status?: string, scope?: RecordAccessScope) {
  return quoteRepository.findAll(page, limit, search, status, scope);
}

export async function getQuoteById(id: string, scope?: RecordAccessScope) {
  const q = await quoteRepository.findById(id, scope);
  if (!q) throw notFound();
  return q;
}

export async function getQuoteCompanies(id: string) {
  return quoteRepository.findAssociatedCompanies(id);
}

export async function getQuoteDeals(id: string) {
  return quoteRepository.findAssociatedDeals(id);
}

export async function getQuoteContacts(id: string) {
  return quoteRepository.findAssociatedContacts(id);
}

// First real write on a quote — creating the draft row and its deal
// association happen together (see quote.repository.ts's create()).
// Expiration date isn't left for the user to set by hand — it's derived from
// Settings > Quotes' configured default (days from today), same as HubSpot's
// own quote defaults behavior.
export async function createQuote(dealId: string) {
  const dealRecord = await getDealById(dealId);
  if (!dealRecord.hubspotId) throw missingHubspotId('Deal');
  const { defaultExpirationDays } = await getQuoteSettings();
  const expirationDate = new Date(Date.now() + defaultExpirationDays * 24 * 60 * 60 * 1000);
  return quoteRepository.create(dealRecord.hubspotId, dealRecord.dealname, expirationDate);
}

export async function updateQuoteDeal(id: string, dealId: string, scope?: RecordAccessScope) {
  const quoteRow = await requireQuoteInScope(id, scope);
  const dealRecord = await getDealById(dealId);
  if (!dealRecord.hubspotId) throw missingHubspotId('Deal');
  await quoteRepository.replaceDealAssociation(quoteRow.hubspotId, dealRecord.hubspotId);
  // The wizard only calls this when the deal is actually changing (see its
  // isDealDirty guard) — the company/contacts picked so far belonged to the
  // deal being replaced, so they're cleared rather than left pointing at
  // records that have nothing to do with the new deal.
  await quoteRepository.clearBuyerAssociations(quoteRow.hubspotId);
  return quoteRepository.findById(id, scope);
}

export async function updateQuoteBuyer(id: string, companyId: string, contactIds: string[], scope?: RecordAccessScope) {
  const quoteRow = await requireQuoteInScope(id, scope);
  const companyRecord = await getCompanyById(companyId);
  if (!companyRecord.hubspotId) throw missingHubspotId('Company');
  const contactRecords = await Promise.all(contactIds.map((contactId) => getContactById(contactId)));
  const missingContact = contactRecords.find((c) => !c.hubspotId);
  if (missingContact) throw missingHubspotId('Contact');

  await quoteRepository.replaceBuyerAssociations(
    quoteRow.hubspotId,
    companyRecord.hubspotId,
    contactRecords.map((c) => c.hubspotId!),
  );
  return quoteRepository.findById(id, scope);
}

export async function updateQuoteSender(id: string, input: UpdateQuoteSenderInput, scope?: RecordAccessScope) {
  await requireQuoteInScope(id, scope);
  await quoteRepository.updateSender(id, input);
  return quoteRepository.findById(id, scope);
}

export async function updateQuoteDetails(id: string, input: UpdateQuoteDetailsInput, scope?: RecordAccessScope) {
  await requireQuoteInScope(id, scope);
  await quoteRepository.updateDetails(id, input);
  return quoteRepository.findById(id, scope);
}

function buildSignUrl(quoteId: string, rawToken: string): string {
  return `${getAppBaseUrl()}/quotes/${quoteId}/preview?signerToken=${rawToken}`;
}

async function sendSignerLinkEmail(quoteTitle: string, signer: { signerName: string; signerEmail: string | null }, signUrl: string) {
  if (!signer.signerEmail) return;
  try {
    await sendEmail({
      feature: 'quote_signature_request',
      to: [signer.signerEmail],
      subject: `Your signature is requested: ${quoteTitle}`,
      html: `
        <p>Hi ${signer.signerName},</p>
        <p>Your signature is requested on ${quoteTitle}. Click below to review and sign.</p>
        <p><a href="${signUrl}">Review & sign</a></p>
      `,
    });
  } catch (error) {
    console.error('Failed to send quote signature request email:', error);
  }
}

// Wizard's Signature step — which buyer contacts (from the quote's own
// Buyer Info selection) must sign. Only while still a Draft: once published,
// the required list is locked in (tokens/emails already went out) — the
// quote has to be recalled (which wipes all signer rows, see recallQuote
// below) before the required set can change.
// signerUserId null means "use the standard countersigner from Settings at
// publish time" (the common case — no row created here, publishQuote falls
// back to the default); a specific id overrides it just for this quote,
// creating the 'internal' row now so it's visible immediately and so
// publishQuote (which only fills in a default when no row exists yet)
// leaves this explicit choice alone.
export async function updateQuoteSigners(
  id: string,
  contactIds: string[],
  signerUserId: string | null,
  scope?: RecordAccessScope,
) {
  const quoteRow = await requireQuoteInScope(id, scope);
  if ((quoteRow.hsQuoteStatus ?? 'DRAFT').toUpperCase() !== 'DRAFT') {
    throw conflict('Recall this quote to Draft before changing who needs to sign it.');
  }
  const contacts = await Promise.all(contactIds.map((contactId) => getContactById(contactId)));
  await quoteRepository.replaceRequiredContactSigners(
    id,
    contacts.map((c) => ({
      contactId: c.id,
      signerName: [c.firstname, c.lastname].filter(Boolean).join(' ') || 'Unnamed contact',
      signerEmail: c.email,
    })),
  );

  await quoteRepository.deleteInternalSigner(id);
  // A countersigner only ever matters in relation to countersigning buyer
  // signatures — with zero required contacts, there's nothing to
  // countersign, so no internal signer is created even if one was picked
  // (a sales rep may have quotes for the same deal that never end up needing
  // signature at all — the whole signer section should just not exist).
  if (signerUserId && contactIds.length > 0) {
    const signerUser = await userRepository.findById(signerUserId);
    if (signerUser) {
      await quoteRepository.createInternalSigner(id, signerUser.id, `${signerUser.firstName} ${signerUser.lastName}`.trim(), signerUser.email);
    }
  }

  return quoteRepository.findSignersByQuote(id);
}

export async function getQuoteSigners(id: string) {
  return quoteRepository.findSignersByQuote(id);
}

// Publishing now also (a) issues each required contact signer their own
// individual token + emailed link, and (b) snapshots the current default
// countersigner from Settings > Objects > Quote > Signature, if one is
// configured — a quote with no required contact signers and/or no default
// signer configured simply skips whichever half doesn't apply, never blocks
// publishing.
export async function publishQuote(id: string, scope?: RecordAccessScope) {
  const quoteRow = await requireQuoteInScope(id, scope);
  await quoteRepository.setStatus(id, 'PUBLISHED');

  const quoteTitle = quoteRow.hsTitle ?? quoteRow.hsDealName ?? 'your quote';
  const signers = await quoteRepository.findSignersByQuote(id);
  const contactSigners = signers.filter((s) => s.signerType === 'contact');

  for (const signer of contactSigners) {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = quoteRow.hsExpirationDate ?? new Date(Date.now() + SIGNER_TOKEN_FALLBACK_TTL_MS);
    await quoteRepository.setSignerToken(signer.id, tokenHash, expiresAt);
    await sendSignerLinkEmail(quoteTitle, signer, buildSignUrl(id, rawToken));
  }

  // No required contact signers means this quote never opted into the
  // signature process at all (e.g. one of several quotes for the same deal
  // that the customer hasn't chosen yet) — skip the countersigner entirely,
  // even if Settings has a standard one configured, so the signer section
  // doesn't show up on the preview page for it.
  //
  // Otherwise: if the Signature step already picked a specific countersigner
  // for this quote, that row already exists (see updateQuoteSigners) and is
  // left alone — only fall back to the Settings default when nothing was
  // chosen.
  const existingInternalSigner = await quoteRepository.findInternalSigner(id);
  const defaultSignerUserId =
    contactSigners.length === 0 || existingInternalSigner ? null : await getDefaultSignerUserId();
  if (defaultSignerUserId) {
    const signerUser = await userRepository.findById(defaultSignerUserId);
    if (signerUser) {
      await quoteRepository.createInternalSigner(
        id,
        signerUser.id,
        `${signerUser.firstName} ${signerUser.lastName}`.trim(),
        signerUser.email,
      );
    }
  }

  return quoteRepository.findById(id, scope);
}

// Recalling wipes every signer row (contact and internal) — see
// deleteSignersByQuote's own comment for why.
export async function recallQuote(id: string, scope?: RecordAccessScope) {
  const quoteRow = await requireQuoteInScope(id, scope);
  // A signed quote is a finalized, signed contract — recalling it to Draft
  // would delete its signers (see below) and erase the record it was ever
  // signed. Enforced here too, not just hidden in the UI, since recall is
  // reachable directly via PUT /:id/recall.
  if (quoteRow.isSigned) throw conflict('This quote has already been signed and can no longer be recalled.');
  await quoteRepository.deleteSignersByQuote(id);
  await quoteRepository.setStatus(id, 'DRAFT');
  return quoteRepository.findById(id, scope);
}

// Public, unauthenticated action (see public.routes.ts) — one required
// buyer contact accepting/signing via their own individually emailed token.
export async function getSignerByToken(rawToken: string) {
  const tokenHash = hashResetToken(rawToken);
  const signer = await quoteRepository.findSignerByTokenHash(tokenHash);
  if (!signer) throw notFound();
  if (signer.tokenExpiresAt && signer.tokenExpiresAt.getTime() < Date.now()) {
    throw conflict('This signing link has expired.');
  }
  return signer;
}

export async function signAsContact(rawToken: string, input: SubmitSignatureInput) {
  const signer = await getSignerByToken(rawToken);
  if (signer.signedAt) throw conflict('This signature has already been submitted.');

  const updated = await quoteRepository.markSignerSigned(signer.id, input);

  const quoteRow = await quoteRepository.findById(signer.quoteId);
  if (!quoteRow) return updated;

  if (await quoteRepository.allContactSignersSigned(signer.quoteId)) {
    const internalSigner = await quoteRepository.findInternalSigner(signer.quoteId);
    if (internalSigner) {
      await quoteRepository.setStatus(signer.quoteId, 'AWAITING_COUNTERSIGNATURE');
      if (internalSigner.signerEmail) {
        try {
          await sendEmail({
            feature: 'quote_countersign_request',
            to: [internalSigner.signerEmail],
            subject: `Ready for your countersignature: ${quoteRow.hsTitle ?? quoteRow.hsDealName ?? 'a quote'}`,
            html: `
              <p>Hi ${internalSigner.signerName},</p>
              <p>All buyer signatures are in for ${quoteRow.hsTitle ?? quoteRow.hsDealName ?? 'this quote'}.
              Sign in to countersign it.</p>
              <p><a href="${getAppBaseUrl()}/quotes/${signer.quoteId}">View quote</a></p>
            `,
          });
        } catch (error) {
          console.error('Failed to send countersignature-request notification:', error);
        }
      }
    } else {
      await quoteRepository.setStatus(signer.quoteId, 'SIGNED');
    }
  }

  return updated;
}

// Authenticated — the internal countersigner must be logged in as the exact
// user snapshotted onto the quote's 'internal' signer row at publish time.
export async function countersignQuote(quoteId: string, userId: string, input: SubmitSignatureInput) {
  const quoteRow = await getQuoteById(quoteId);
  if ((quoteRow.hsQuoteStatus ?? '').toUpperCase() !== 'AWAITING_COUNTERSIGNATURE') {
    throw conflict('This quote is not awaiting a countersignature.');
  }
  const signer = await quoteRepository.findInternalSigner(quoteId);
  if (!signer) throw notFound();
  if (signer.userId !== userId) throw forbidden('You are not the designated signer for this quote.');
  if (signer.signedAt) throw conflict('This quote has already been countersigned.');

  const updated = await quoteRepository.markSignerSigned(signer.id, input);
  await quoteRepository.setStatus(quoteId, 'SIGNED');
  return updated;
}

// Admin action on the quote detail page for a contact signer who lost their
// email or whose link expired — mirrors the user-invite feature's
// resendInvite (src/modules/users/user.service.ts) exactly: invalidate by
// simply overwriting with a fresh token, re-send.
export async function resendSignerLink(quoteId: string, signerId: string, scope?: RecordAccessScope) {
  const quoteRow = await requireQuoteInScope(quoteId, scope);
  const signer = await quoteRepository.findSignerById(quoteId, signerId);
  if (!signer || signer.signerType !== 'contact') throw notFound();
  if (signer.signedAt) throw conflict('This signer has already signed.');

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = quoteRow.hsExpirationDate ?? new Date(Date.now() + SIGNER_TOKEN_FALLBACK_TTL_MS);
  await quoteRepository.setSignerToken(signer.id, tokenHash, expiresAt);
  await sendSignerLinkEmail(quoteRow.hsTitle ?? quoteRow.hsDealName ?? 'your quote', signer, buildSignUrl(quoteId, rawToken));
}

export async function deleteQuote(id: string, scope?: RecordAccessScope) {
  const deleted = await quoteRepository.remove(id, scope);
  if (!deleted) throw notFound();
}

export async function getQuoteLineItems(id: string) {
  return quoteRepository.findLineItemsByQuote(id);
}

export async function createQuoteLineItem(quoteId: string, input: CreateLineItemInput, scope?: RecordAccessScope) {
  const quoteRow = await requireQuoteInScope(quoteId, scope);
  const created = await quoteRepository.createLineItem(quoteRow, input);
  await quoteRepository.recalculateQuoteAmount(quoteId);
  return created;
}

async function requireLineItemOnQuote(quoteId: string, lineItemId: string) {
  const owningQuoteId = await quoteRepository.findQuoteIdForLineItem(lineItemId);
  if (owningQuoteId !== quoteId) throw notFound();
}

export async function updateQuoteLineItem(
  quoteId: string,
  lineItemId: string,
  input: UpdateLineItemInput,
  scope?: RecordAccessScope,
) {
  await requireQuoteInScope(quoteId, scope);
  await requireLineItemOnQuote(quoteId, lineItemId);
  const updated = await quoteRepository.updateLineItem(lineItemId, input);
  if (!updated) throw notFound();
  await quoteRepository.recalculateQuoteAmount(quoteId);
  return updated;
}

export async function reorderQuoteLineItems(quoteId: string, lineItemIds: string[], scope?: RecordAccessScope) {
  await requireQuoteInScope(quoteId, scope);
  await quoteRepository.reorderLineItems(quoteId, lineItemIds);
}

export async function deleteQuoteLineItem(quoteId: string, lineItemId: string, scope?: RecordAccessScope) {
  await requireQuoteInScope(quoteId, scope);
  await requireLineItemOnQuote(quoteId, lineItemId);
  const deleted = await quoteRepository.removeLineItem(lineItemId);
  if (!deleted) throw notFound();
  await quoteRepository.recalculateQuoteAmount(quoteId);
}

export async function getQuoteDiscounts(id: string) {
  return quoteRepository.findDiscountsByQuote(id);
}

export async function createQuoteDiscount(quoteId: string, input: CreateQuoteDiscountInput, scope?: RecordAccessScope) {
  await requireQuoteInScope(quoteId, scope);
  const created = await quoteRepository.createDiscount(quoteId, input);
  await quoteRepository.recalculateQuoteAmount(quoteId);
  return created;
}

export async function updateQuoteDiscount(
  quoteId: string,
  discountId: string,
  input: UpdateQuoteDiscountInput,
  scope?: RecordAccessScope,
) {
  await requireQuoteInScope(quoteId, scope);
  const updated = await quoteRepository.updateDiscount(quoteId, discountId, input);
  if (!updated) throw notFound();
  await quoteRepository.recalculateQuoteAmount(quoteId);
  return updated;
}

export async function deleteQuoteDiscount(quoteId: string, discountId: string, scope?: RecordAccessScope) {
  await requireQuoteInScope(quoteId, scope);
  const deleted = await quoteRepository.removeDiscount(quoteId, discountId);
  if (!deleted) throw notFound();
  await quoteRepository.recalculateQuoteAmount(quoteId);
}

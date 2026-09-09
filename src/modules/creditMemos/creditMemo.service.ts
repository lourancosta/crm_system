import { getCompanyById } from '../companies/company.service';
import { getContactById } from '../contacts/contact.service';
import { getInvoiceById } from '../invoices/invoice.service';
import { logHistoryEvent } from '../history/history.service';
import * as repo from './creditMemo.repository';
import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { CreateCreditMemoInput, UpdateCreditMemoInput } from './creditMemo.types';

function notFound() {
  const err = new Error('Credit memo not found') as Error & { statusCode?: number };
  err.statusCode = 404;
  return err;
}

function badRequest(message: string) {
  const err = new Error(message) as Error & { statusCode?: number };
  err.statusCode = 400;
  return err;
}

function missingHubspotId(entity: string) {
  const err = new Error(`${entity} is missing an external ID and cannot be linked to a credit memo`) as Error & {
    statusCode?: number;
  };
  err.statusCode = 422;
  return err;
}

export const listCreditMemos = (page: number, limit: number, search?: string, status?: string, scope?: RecordAccessScope) =>
  repo.findAll(page, limit, search, status, scope);

export async function getCreditMemoById(id: string, scope?: RecordAccessScope) {
  const cm = await repo.findById(id, scope);
  if (!cm) throw notFound();
  return cm;
}

export async function createCreditMemo(input: CreateCreditMemoInput, userId?: string) {
  // A credit memo is a company-level reusable balance now (applied to
  // invoices ad hoc via credit_memo_applications) — an originating invoice is
  // no longer required, though one can still be given (e.g. issued to
  // correct a specific overbilled invoice).
  let invoiceHubspotId: string | undefined;
  let currency = 'USD';
  if (input.invoiceId) {
    const invoice = await getInvoiceById(input.invoiceId);
    if (!invoice.hubspotId) throw missingHubspotId('Invoice');
    invoiceHubspotId = invoice.hubspotId;
    currency = invoice.hsCurrency ?? 'USD';
  }

  let companyHubspotId: string | undefined;
  if (input.companyId) {
    const company = await getCompanyById(input.companyId);
    if (!company.hubspotId) throw missingHubspotId('Company');
    companyHubspotId = company.hubspotId;
  }

  let contactHubspotId: string | undefined;
  if (input.contactId) {
    const contact = await getContactById(input.contactId);
    if (!contact.hubspotId) throw missingHubspotId('Contact');
    contactHubspotId = contact.hubspotId;
  }

  const creditMemo = await repo.create({
    invoiceHubspotId,
    amount: input.amount,
    currency,
    reason: input.reason,
    companyHubspotId,
    contactHubspotId,
  });

  await logHistoryEvent({
    objectType: input.invoiceId ? 'invoices' : 'creditMemos',
    objectId: input.invoiceId ?? creditMemo.id,
    title: 'Credit memo issued',
    description: [`${input.amount} ${currency}`, input.reason].filter(Boolean).join(' — '),
    userId,
  });

  return creditMemo;
}

export async function updateCreditMemo(id: string, input: UpdateCreditMemoInput, scope?: RecordAccessScope) {
  const updated = await repo.update(id, input, scope);
  if (!updated) throw notFound();
  return updated;
}

export async function deleteCreditMemo(id: string, scope?: RecordAccessScope) {
  const deleted = await repo.remove(id, scope);
  if (!deleted) throw notFound();
}

// Mirrors invoice.service.ts's voidInvoice: its own separate check, not
// gated behind the generic update path. Once any part of a memo has been
// applied to an invoice, voiding it would leave that invoice's balance
// reduced by a reference to a now-voided memo — so only a still-fully-
// unapplied (or already-uncommitted draft) memo can be voided; an
// already-voided one can't be voided again.
export async function voidCreditMemo(id: string, scope?: RecordAccessScope) {
  const cm = await getCreditMemoById(id, scope);
  const status = (cm.hsCreditMemoStatus ?? '').toLowerCase();
  if (status === 'voided') {
    throw badRequest('This credit memo is already voided.');
  }
  if (Number(cm.appliedAmount) > 0) {
    throw badRequest('A credit memo with an applied amount cannot be voided. Remove its applications first.');
  }
  const updated = await repo.voidCreditMemo(id, scope);
  if (!updated) throw notFound();
  return updated;
}

export const getCreditMemoInvoices = (id: string) => repo.findAssociatedInvoice(id);
export const getCreditMemoCompanies = (id: string) => repo.findAssociatedCompanies(id);
export const getCreditMemoContacts = (id: string) => repo.findAssociatedContacts(id);

export const getAvailableCreditMemosForCompany = (companyId: string, excludeInvoiceId?: string) =>
  repo.findAvailableForCompany(companyId, excludeInvoiceId);

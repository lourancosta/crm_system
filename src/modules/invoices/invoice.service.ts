import { db } from '../../db/client';
import { getCompanyById } from '../companies/company.service';
import { getContactById } from '../contacts/contact.service';
import { logHistoryEvent } from '../history/history.service';
import * as invoiceRepository from './invoice.repository';
import * as productRepository from '../products/product.repository';
import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { Company } from '../companies/company.types';
import type { Contact } from '../contacts/contact.types';
import type { RecipientSnapshotInput } from './invoice.repository';
import type {
  CreateCreditMemoApplicationInput,
  CreateInvoiceDiscountInput,
  CreateInvoiceInput,
  CreateLineItemInput,
  InvoiceClonePreview,
  UpdateCreditMemoApplicationInput,
  UpdateInvoiceDetailsInput,
  UpdateInvoiceDiscountInput,
  UpdateLineItemInput,
} from './invoice.types';

// Denormalized snapshot of the company/contact at the moment they're
// (re-)associated with an invoice — see invoice.repository.ts's
// RecipientSnapshotInput for why this needs to stay in sync separately from
// the dynamic_associations rows.
function recipientSnapshot(company: Company, contact: Contact): RecipientSnapshotInput {
  return {
    companyName: company.name,
    companyAddress: company.address,
    companyCity: company.city,
    companyState: company.state,
    companyCountry: company.country,
    companyZip: company.zip,
    contactEmail: contact.email,
    contactFirstname: contact.firstname,
    contactLastname: contact.lastname,
  };
}

function notFound(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

function badRequest(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;
  return error;
}

function missingHubspotId(entity: string) {
  const err = new Error(`${entity} is missing an external ID and cannot be linked to an invoice`) as Error & {
    statusCode?: number;
  };
  err.statusCode = 422;
  return err;
}

// Authoritative guard (the frontend hiding Edit/Delete when the status
// doesn't qualify is UX only) — a settled (paid/voided) invoice can't be
// edited or deleted, nor can its line items.
const EDITABLE_STATUSES = new Set(['open', 'draft']);

async function requireEditableInvoice(id: string, scope?: RecordAccessScope) {
  const inv = await invoiceRepository.findById(id, scope);
  if (!inv) throw notFound('Invoice not found');
  if (!EDITABLE_STATUSES.has((inv.hsInvoiceStatus ?? '').toLowerCase())) {
    throw badRequest('Only open or draft invoices can be edited.');
  }
  return inv;
}

// Same existence/scope check as requireEditableInvoice, without the status
// restriction — for credit memo applications, which (like payments, see
// payment.service.ts's updatePayment/deletePayment) aren't gated by invoice
// status at all. Necessary, not just permissive: fully applying a credit
// memo can itself flip the invoice to 'paid' (see recalculateAmountBilled),
// and EDITABLE_STATUSES excludes 'paid' — so gating these the same as line
// items/discounts would make removing/adjusting the very application that
// caused that status permanently impossible.
async function requireInvoice(id: string, scope?: RecordAccessScope) {
  const inv = await invoiceRepository.findById(id, scope);
  if (!inv) throw notFound('Invoice not found');
  return inv;
}

export async function getInvoices(page: number, limit: number, search?: string, status?: string, type?: string, scope?: RecordAccessScope) {
  return invoiceRepository.findAll(page, limit, search, status, type, scope);
}

export async function getInvoiceLineItems(id: string) {
  return invoiceRepository.findLineItemsByInvoice(id);
}

export async function getInvoiceCompanies(id: string) {
  return invoiceRepository.findAssociatedCompanies(id);
}

export async function getInvoiceContacts(id: string) {
  return invoiceRepository.findAssociatedContacts(id);
}

export async function getInvoiceDeals(id: string) {
  return invoiceRepository.findAssociatedDeals(id);
}

export async function getInvoicePayments(id: string) {
  return invoiceRepository.findAssociatedPayments(id);
}

export async function getInvoiceCreditMemos(id: string) {
  return invoiceRepository.findAssociatedCreditMemos(id);
}

export async function getInvoiceDiscounts(id: string) {
  return invoiceRepository.findDiscountsByInvoice(id);
}

export async function getInvoiceById(id: string, scope?: RecordAccessScope) {
  const inv = await invoiceRepository.findById(id, scope);
  if (!inv) {
    const error = new Error('Invoice not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }
  const creditMemoTotal = await invoiceRepository.sumCreditMemosForInvoice(id);
  const adjustedBalanceDue = (Number(inv.hsBalanceDue ?? 0) - creditMemoTotal).toFixed(2);
  return { ...inv, creditMemoTotal, adjustedBalanceDue };
}

// Re-derives hsAmountBilled/hsAmountPaid/hsBalanceDue from the invoice's
// current line items, discounts, and payments — called by payment.service.ts
// whenever a payment is registered, edited, or removed, since hsAmountPaid/
// hsBalanceDue would otherwise only ever change via line-item/discount edits.
export async function recalculateInvoiceAmounts(invoiceId: string): Promise<void> {
  await invoiceRepository.recalculateAmountBilled(invoiceId);
}

export async function getNextInvoiceNumber(): Promise<string> {
  return invoiceRepository.getNextInvoiceNumber();
}

export async function createInvoice(input: CreateInvoiceInput, userId?: string) {
  const company = await getCompanyById(input.companyId);
  if (!company.hubspotId) throw missingHubspotId('Company');

  const contact = await getContactById(input.contactId);
  if (!contact.hubspotId) throw missingHubspotId('Contact');

  // Never trust an MSP level from the client — derive it from the company's
  // own record at the moment the invoice is created.
  const mspLevel = input.typeObj === 'msp' ? (company.partnerMspLevel ?? null) : null;

  const created = await db.transaction(async (tx) => {
    const inv = await invoiceRepository.create(
      {
        ...input,
        companyHubspotId: company.hubspotId!,
        contactHubspotId: contact.hubspotId!,
        mspLevel,
        ...recipientSnapshot(company, contact),
      },
      tx,
    );

    for (const lineItem of input.lineItems) {
      await invoiceRepository.createLineItem(inv, lineItem, tx);
    }

    for (const discount of input.discounts ?? []) {
      await invoiceRepository.createDiscount(inv.id, discount, tx);
    }

    for (const application of input.creditMemoApplications ?? []) {
      await invoiceRepository.createCreditMemoApplication(inv.id, application, tx);
    }

    await invoiceRepository.recalculateAmountBilled(inv.id, tx);
    return invoiceRepository.findById(inv.id, undefined, tx);
  });

  if (!created) throw notFound('Invoice not found after creation');

  await logHistoryEvent({ objectType: 'invoices', objectId: created.id, title: 'Invoice created', userId });

  return created;
}

// Builds a read-only preview of what cloning this invoice would look like —
// nothing is persisted. The frontend uses this to pre-fill the same
// create-invoice form the user would fill out by hand (company, contact,
// type, line items, discounts); the form's own defaults handle invoice date
// (today) and payment term (net30), and the actual new invoice is only
// created when the user submits that form through the normal POST /invoices.
//
// Line items are re-resolved back to their product via hsProductId (the only
// link a line item retains to `product`, since line_item has no FK to it) —
// this is what lets the pre-filled form carry a real productId, which the
// source invoice's line items never explicitly stored. A line item whose
// product can no longer be resolved (archived/deleted) is left out and noted
// rather than blocking the whole preview; same for an archived company/contact.
export async function getInvoiceClonePreview(id: string, scope?: RecordAccessScope): Promise<InvoiceClonePreview> {
  const original = await invoiceRepository.findById(id, scope);
  if (!original) throw notFound('Invoice not found');

  const [companies, contacts, sourceLineItems, sourceDiscounts] = await Promise.all([
    invoiceRepository.findAssociatedCompanies(id),
    invoiceRepository.findAssociatedContacts(id),
    invoiceRepository.findLineItemsForClone(id),
    invoiceRepository.findDiscountsByInvoice(id),
  ]);

  const notes: string[] = [];
  const company = companies[0];
  const contact = contacts[0];
  if (!company) notes.push('The original company is no longer active — select one to continue.');
  if (!contact) notes.push('The original contact is no longer active — select one to continue.');

  const lineItems: InvoiceClonePreview['lineItems'] = [];
  for (const li of sourceLineItems) {
    // hsProductId is missing on a large share of line items synced from
    // HubSpot in bulk before this app tracked per-item product associations
    // — fall back to matching the product by its (unique, active) name.
    let product = li.hsProductId ? await productRepository.findByHsObjectId(li.hsProductId) : null;
    if (!product && li.name) {
      product = await productRepository.findByName(li.name);
    }
    if (!product) {
      notes.push(`Line item "${li.name ?? 'Unnamed line item'}" was left out — its product couldn't be matched.`);
      continue;
    }
    lineItems.push({
      productId: product.id,
      name: li.name ?? product.name ?? '',
      description: li.description ?? product.description ?? '',
      customerName: li.customerName ?? '',
      price: li.price !== null ? Number(li.price) : Number(product.hsPriceUsd ?? 0),
      quantity: Number(li.quantity ?? 1),
      hsDiscountPercentage: li.hsDiscountPercentage !== null ? Number(li.hsDiscountPercentage) : 0,
      discount: li.discount !== null ? Number(li.discount) : 0,
      discountType: li.discountType === 'amount' ? 'amount' : 'percentage',
    });
  }

  const discounts: CreateInvoiceDiscountInput[] = sourceDiscounts.map((d) => ({
    name: d.name,
    kind: d.kind,
    value: Number(d.value),
  }));

  return {
    companyId: company?.id ?? null,
    contactId: contact?.id ?? null,
    typeObj: (original.typeObj as 'reseller' | 'msp' | null) ?? null,
    lineItems,
    discounts,
    notes,
  };
}

// Backs the edit modal (a repurposed CreateInvoiceForm) — every invoice-level
// field the create form collects is editable here too, including
// re-pointing the company/contact association. Line items are mutated
// separately via createInvoiceLineItem/updateInvoiceLineItem/
// deleteInvoiceLineItem (see UpdateInvoiceDetailsInput's comment for why).
export async function updateInvoice(id: string, input: UpdateInvoiceDetailsInput, scope?: RecordAccessScope) {
  await requireEditableInvoice(id, scope);

  const company = await getCompanyById(input.companyId);
  if (!company.hubspotId) throw missingHubspotId('Company');

  const contact = await getContactById(input.contactId);
  if (!contact.hubspotId) throw missingHubspotId('Contact');

  const mspLevel = input.typeObj === 'msp' ? (company.partnerMspLevel ?? null) : null;

  const updated = await db.transaction(async (tx) => {
    return invoiceRepository.updateDetails(
      id,
      {
        ...input,
        companyHubspotId: company.hubspotId!,
        contactHubspotId: contact.hubspotId!,
        mspLevel,
        ...recipientSnapshot(company, contact),
      },
      tx,
      scope,
    );
  });

  if (!updated) throw notFound('Invoice not found');
  return updated;
}

export async function deleteInvoice(id: string, scope?: RecordAccessScope) {
  await requireEditableInvoice(id, scope);
  const deleted = await invoiceRepository.remove(id, scope);
  if (!deleted) throw notFound('Invoice not found');
}

// Deliberately not gated behind requireEditableInvoice's open/draft-only
// rule — voiding is its own, separate check. A paid invoice can't be voided
// (it's settled — use a credit memo to reverse it instead), and an
// already-voided invoice can't be voided again.
export async function voidInvoice(id: string, scope?: RecordAccessScope) {
  const inv = await invoiceRepository.findById(id, scope);
  if (!inv) throw notFound('Invoice not found');
  const status = (inv.hsInvoiceStatus ?? '').toLowerCase();
  if (status === 'voided') {
    throw badRequest('This invoice is already voided.');
  }
  if (status === 'paid') {
    throw badRequest('A paid invoice cannot be voided.');
  }
  const updated = await invoiceRepository.update(id, { hsInvoiceStatus: 'voided' }, scope);
  if (!updated) throw notFound('Invoice not found');
  return updated;
}

// Finalizes a draft: assigns the real sequential invoice number (deferred
// until now so concurrent in-progress drafts never burn/reserve one) and
// flips status to 'open', which is also what makes the invoice visible via
// its public preview link (see public.routes.ts's status gate).
export async function publishInvoice(id: string, scope?: RecordAccessScope) {
  const inv = await invoiceRepository.findById(id, scope);
  if (!inv) throw notFound('Invoice not found');
  if ((inv.hsInvoiceStatus ?? '').toLowerCase() !== 'draft') {
    throw badRequest('This invoice has already been created.');
  }

  const [companies, contacts, lineItems] = await Promise.all([
    invoiceRepository.findAssociatedCompanies(id),
    invoiceRepository.findAssociatedContacts(id),
    invoiceRepository.findLineItemsByInvoice(id),
  ]);
  if (companies.length === 0) throw badRequest('Select a company before creating this invoice.');
  if (contacts.length === 0) throw badRequest('Select a billing contact before creating this invoice.');
  if (lineItems.length === 0) throw badRequest('Add at least one line item before creating this invoice.');

  const updated = await db.transaction(async (tx) => {
    const hsNumber = await invoiceRepository.getNextInvoiceNumber(tx);
    return invoiceRepository.update(id, { hsNumber, hsInvoiceStatus: 'open' }, scope, tx);
  });
  if (!updated) throw notFound('Invoice not found');
  return updated;
}

export async function createInvoiceLineItem(invoiceId: string, input: CreateLineItemInput, scope?: RecordAccessScope) {
  const inv = await requireEditableInvoice(invoiceId, scope);
  const created = await invoiceRepository.createLineItem(inv, input);
  await invoiceRepository.recalculateAmountBilled(invoiceId);
  return created;
}

async function requireLineItemOnInvoice(invoiceId: string, lineItemId: string) {
  const owningInvoiceId = await invoiceRepository.findInvoiceIdForLineItem(lineItemId);
  if (owningInvoiceId !== invoiceId) throw notFound('Line item not found on this invoice');
}

export async function updateInvoiceLineItem(invoiceId: string, lineItemId: string, input: UpdateLineItemInput, scope?: RecordAccessScope) {
  await requireEditableInvoice(invoiceId, scope);
  await requireLineItemOnInvoice(invoiceId, lineItemId);
  const updated = await invoiceRepository.updateLineItem(lineItemId, input);
  if (!updated) throw notFound('Line item not found');
  await invoiceRepository.recalculateAmountBilled(invoiceId);
  return updated;
}

export async function deleteInvoiceLineItem(invoiceId: string, lineItemId: string, scope?: RecordAccessScope) {
  await requireEditableInvoice(invoiceId, scope);
  await requireLineItemOnInvoice(invoiceId, lineItemId);
  const deleted = await invoiceRepository.removeLineItem(lineItemId);
  if (!deleted) throw notFound('Line item not found');
  await invoiceRepository.recalculateAmountBilled(invoiceId);
}

export async function createInvoiceDiscount(invoiceId: string, input: CreateInvoiceDiscountInput, scope?: RecordAccessScope) {
  await requireEditableInvoice(invoiceId, scope);
  const created = await invoiceRepository.createDiscount(invoiceId, input);
  await invoiceRepository.recalculateAmountBilled(invoiceId);
  return created;
}

export async function updateInvoiceDiscount(
  invoiceId: string,
  discountId: string,
  input: UpdateInvoiceDiscountInput,
  scope?: RecordAccessScope,
) {
  await requireEditableInvoice(invoiceId, scope);
  const updated = await invoiceRepository.updateDiscount(invoiceId, discountId, input);
  if (!updated) throw notFound('Discount not found');
  await invoiceRepository.recalculateAmountBilled(invoiceId);
  return updated;
}

export async function deleteInvoiceDiscount(invoiceId: string, discountId: string, scope?: RecordAccessScope) {
  await requireEditableInvoice(invoiceId, scope);
  const deleted = await invoiceRepository.removeDiscount(invoiceId, discountId);
  if (!deleted) throw notFound('Discount not found');
  await invoiceRepository.recalculateAmountBilled(invoiceId);
}

export async function getInvoiceCreditMemoApplications(id: string) {
  return invoiceRepository.findCreditMemoApplications(id);
}

export async function createInvoiceCreditMemoApplication(
  invoiceId: string,
  input: CreateCreditMemoApplicationInput,
  scope?: RecordAccessScope,
) {
  await requireInvoice(invoiceId, scope);
  const created = await invoiceRepository.createCreditMemoApplication(invoiceId, input);
  await invoiceRepository.recalculateAmountBilled(invoiceId);
  return created;
}

export async function updateInvoiceCreditMemoApplication(
  invoiceId: string,
  applicationId: string,
  input: UpdateCreditMemoApplicationInput,
  scope?: RecordAccessScope,
) {
  await requireInvoice(invoiceId, scope);
  const updated = await invoiceRepository.updateCreditMemoApplication(invoiceId, applicationId, input);
  if (!updated) throw notFound('Credit memo application not found');
  await invoiceRepository.recalculateAmountBilled(invoiceId);
  return updated;
}

export async function deleteInvoiceCreditMemoApplication(invoiceId: string, applicationId: string, scope?: RecordAccessScope) {
  await requireInvoice(invoiceId, scope);
  const deleted = await invoiceRepository.removeCreditMemoApplication(invoiceId, applicationId);
  if (!deleted) throw notFound('Credit memo application not found');
  await invoiceRepository.recalculateAmountBilled(invoiceId);
}

import { getInvoiceById, recalculateInvoiceAmounts } from '../invoices/invoice.service';
import { logHistoryEvent } from '../history/history.service';
import * as repo from './payment.repository';
import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { CreatePaymentInput, UpdatePaymentInput } from './payment.types';

function notFound() {
  const err = new Error('Payment not found') as Error & { statusCode?: number };
  err.statusCode = 404;
  return err;
}

export const listPayments = (page: number, limit: number, search?: string, scope?: RecordAccessScope) =>
  repo.findAll(page, limit, search, scope);

export async function getPaymentById(id: string, scope?: RecordAccessScope) {
  const p = await repo.findById(id, scope);
  if (!p) throw notFound();
  return p;
}

export async function createPayment(input: CreatePaymentInput, userId?: string) {
  const invoice = await getInvoiceById(input.invoiceId);
  if (!invoice.hubspotId) {
    const err = new Error('Invoice is missing an external ID and cannot be linked to a payment') as Error & {
      statusCode?: number;
    };
    err.statusCode = 422;
    throw err;
  }

  const payment = await repo.create({
    invoiceHubspotId: invoice.hubspotId,
    amount: input.amount,
    currency: invoice.hsCurrency ?? 'USD',
    paymentMethodType: input.paymentMethod,
    initiatedDate: new Date(input.paymentDate),
    referenceNumber: input.referenceNumber,
    internalComment: input.internalNote,
  });

  await recalculateInvoiceAmounts(input.invoiceId);

  await logHistoryEvent({
    objectType: 'invoices',
    objectId: input.invoiceId,
    title: 'Payment registered',
    description: `${input.amount} ${invoice.hsCurrency ?? 'USD'} via ${input.paymentMethod.replace(/_/g, ' ')}`,
    userId,
  });

  return payment;
}

export async function updatePayment(id: string, input: UpdatePaymentInput, scope?: RecordAccessScope) {
  const updated = await repo.update(id, input, scope);
  if (!updated) throw notFound();
  const invoices = await repo.findAssociatedInvoices(id);
  await Promise.all(invoices.map((inv) => recalculateInvoiceAmounts(inv.id)));
  return updated;
}

export async function deletePayment(id: string, scope?: RecordAccessScope) {
  const invoices = await repo.findAssociatedInvoices(id);
  const deleted = await repo.remove(id, scope);
  if (!deleted) throw notFound();
  await Promise.all(invoices.map((inv) => recalculateInvoiceAmounts(inv.id)));
}

export const getPaymentInvoices = (id: string) => repo.findAssociatedInvoices(id);

export const getPaymentCompanies = (id: string) => repo.findAssociatedCompanies(id);

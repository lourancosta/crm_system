import { randomUUID } from 'crypto';
import { and, count, eq, or, sql } from 'drizzle-orm';
import { ilike } from '../../lib/sqlHelpers';
import { db } from '../../db/client';
import { company, dynamicAssociation, invoice, payment } from '../../db/schema';
import { scopeCondition, type RecordAccessScope } from '../../lib/scopeFilter';
import type {
  AssociatedCompany,
  AssociatedInvoice,
  PaginatedResult,
  PaymentMethod,
  PaymentRecord,
  UpdatePaymentInput,
} from './payment.types';

const PAYMENT_FIELDS = {
  id: payment.id,
  hubspotId: payment.hubspotId,
  archived: payment.archived,
  hsPaymentId: payment.hsPaymentId,
  hsInitialAmount: payment.hsInitialAmount,
  hsNetAmount: payment.hsNetAmount,
  hsFeesAmount: payment.hsFeesAmount,
  hsCurrencyCode: payment.hsCurrencyCode,
  hsLatestStatus: payment.hsLatestStatus,
  hsPaymentMethodType: payment.hsPaymentMethodType,
  hsPaymentType: payment.hsPaymentType,
  hsProcessorType: payment.hsProcessorType,
  hsCustomerEmail: payment.hsCustomerEmail,
  hsReferenceNumber: payment.hsReferenceNumber,
  hsInternalComment: payment.hsInternalComment,
  hsInitiatedDate: payment.hsInitiatedDate,
  hsCreatedate: payment.hsCreatedate,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
  companyName: sql<string | null>`(
    select c.name from dynamic_associations da
    join companies c on c.hubspot_id = da.to_hubspot_id
    where da.from_object_type = 'payments' and da.from_hubspot_id = payments.hubspot_id
      and da.to_object_type = 'companies' and c.archived = false
    order by da.id asc
    limit 1
  )`,
};

const paymentColumns = { hubspotId: payment.hubspotId, hubspotOwnerId: payment.hubspotOwnerId };

export async function findAll(page: number, limit: number, search?: string, scope?: RecordAccessScope): Promise<PaginatedResult<PaymentRecord>> {
  const where = and(
    eq(payment.archived, false),
    search
      ? or(
          ilike(payment.hsPaymentId, `%${search}%`),
          ilike(payment.hsCustomerEmail, `%${search}%`),
          ilike(payment.hsReferenceNumber, `%${search}%`),
          // Payments have no denormalized company-name column (unlike
          // invoices) — match via the associated company directly.
          sql`EXISTS (
            SELECT 1 FROM dynamic_associations da
            JOIN companies c ON c.hubspot_id = da.to_hubspot_id
            WHERE da.from_object_type = 'payments' AND da.from_hubspot_id = ${payment.hubspotId}
              AND da.to_object_type = 'companies' AND c.archived = false AND LOWER(c.name) LIKE LOWER(${`%${search}%`})
          )`,
        )
      : undefined,
    scopeCondition(scope, 'payments', paymentColumns),
  );

  const [data, countResult] = await Promise.all([
    db
      .select(PAYMENT_FIELDS)
      .from(payment)
      .where(where)
      .orderBy(sql`${payment.hsInitiatedDate} DESC`)
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(payment).where(where),
  ]);

  return { data, total: Number(countResult[0].count), page, limit };
}

export async function findById(id: string, scope?: RecordAccessScope): Promise<PaymentRecord | null> {
  const rows = await db
    .select(PAYMENT_FIELDS)
    .from(payment)
    .where(and(eq(payment.id, id), eq(payment.archived, false), scopeCondition(scope, 'payments', paymentColumns)))
    .limit(1);
  return rows[0] ?? null;
}

export type CreatePaymentRecordInput = {
  invoiceHubspotId: string;
  amount: string;
  currency: string;
  paymentMethodType: PaymentMethod;
  initiatedDate: Date;
  referenceNumber?: string;
  internalComment?: string;
};

export async function create(input: CreatePaymentRecordInput): Promise<PaymentRecord> {
  const id = randomUUID();
  const hubspotId = `local-${id}`;

  await db.insert(payment).values({
    id,
    hubspotId,
    archived: false,
    hsInitialAmount: input.amount,
    hsNetAmount: input.amount,
    hsCurrencyCode: input.currency,
    hsPaymentMethodType: input.paymentMethodType,
    hsInitiatedDate: input.initiatedDate,
    hsReferenceNumber: input.referenceNumber ?? null,
    hsInternalComment: input.internalComment ?? null,
    hsLatestStatus: 'succeeded',
    hsProcessorType: 'manually_recorded',
  });

  await db.insert(dynamicAssociation).values([
    {
      fromObjectType: 'invoices',
      fromHubspotId: input.invoiceHubspotId,
      toObjectType: 'payments',
      toHubspotId: hubspotId,
      associationLabel: 'invoice_to_commerce_payment',
    },
    {
      fromObjectType: 'payments',
      fromHubspotId: hubspotId,
      toObjectType: 'invoices',
      toHubspotId: input.invoiceHubspotId,
      associationLabel: 'commerce_payment_to_invoice',
    },
  ]);

  const created = await findById(id);
  if (!created) throw new Error('Failed to load payment after creation');
  return created;
}

export async function update(id: string, input: UpdatePaymentInput, scope?: RecordAccessScope): Promise<PaymentRecord | null> {
  const [result] = await db
    .update(payment)
    .set({
      ...(input.amount !== undefined ? { hsInitialAmount: input.amount, hsNetAmount: input.amount } : {}),
      ...(input.paymentDate !== undefined ? { hsInitiatedDate: new Date(input.paymentDate) } : {}),
      ...(input.paymentMethod !== undefined ? { hsPaymentMethodType: input.paymentMethod } : {}),
      ...(input.referenceNumber !== undefined ? { hsReferenceNumber: input.referenceNumber } : {}),
      ...(input.internalNote !== undefined ? { hsInternalComment: input.internalNote } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(payment.id, id), eq(payment.archived, false), scopeCondition(scope, 'payments', paymentColumns)));
  if (result.affectedRows === 0) return null;
  return findById(id);
}

// Soft-archive, matching every other object's remove() in this codebase.
export async function remove(id: string, scope?: RecordAccessScope): Promise<boolean> {
  const [result] = await db
    .update(payment)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(payment.id, id), scopeCondition(scope, 'payments', paymentColumns)));
  return result.affectedRows > 0;
}

export async function findAssociatedInvoices(paymentId: string): Promise<AssociatedInvoice[]> {
  return db
    .selectDistinct({
      id: invoice.id,
      hsNumber: invoice.hsNumber,
      hsInvoiceStatus: invoice.hsInvoiceStatus,
      hsBalanceDue: invoice.hsBalanceDue,
      hsCurrency: invoice.hsCurrency,
      hsDueDate: invoice.hsDueDate,
    })
    .from(payment)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "payments"),
        eq(dynamicAssociation.fromHubspotId, payment.hubspotId),
        eq(dynamicAssociation.toObjectType, "invoices"),
      ),
    )
    .innerJoin(invoice, eq(invoice.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(payment.id, paymentId), eq(invoice.archived, false)));
}

export async function findAssociatedCompanies(paymentId: string): Promise<AssociatedCompany[]> {
  return db
    .selectDistinct({
      id: company.id,
      name: company.name,
      domain: company.domain,
      website: company.website,
    })
    .from(payment)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "payments"),
        eq(dynamicAssociation.fromHubspotId, payment.hubspotId),
        eq(dynamicAssociation.toObjectType, "companies"),
      ),
    )
    .innerJoin(company, eq(company.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(payment.id, paymentId), eq(company.archived, false)));
}

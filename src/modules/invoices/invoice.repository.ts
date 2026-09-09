import { randomUUID } from "crypto";
import { and, asc, count, eq, notExists, or, sql } from "drizzle-orm";
import { ilike } from "../../lib/sqlHelpers";
import { roundMoney } from "../../lib/money";
import { db } from "../../db/client";
import { contactLite as contact, creditMemoLite } from "../../db/lightTables";
import {
  company,
  creditMemoApplication,
  deal,
  dynamicAssociation,
  invoice,
  invoiceDiscount,
  lineItem,
  payment,
  product,
} from "../../db/schema";
import { scopeCondition, type RecordAccessScope } from "../../lib/scopeFilter";
import type {
  CreateCreditMemoApplicationInput,
  CreateInvoiceDiscountInput,
  CreateInvoiceInput,
  CreateLineItemInput,
  CreditMemoApplication,
  Invoice,
  InvoiceDiscount,
  InvoiceDiscountKind,
  LineItem,
  PaginatedResult,
  UpdateCreditMemoApplicationInput,
  UpdateInvoiceDetailsInput,
  UpdateInvoiceDiscountInput,
  UpdateInvoiceInput,
  UpdateLineItemInput,
} from "./invoice.types";

// Allows callers (invoice.service.ts's createInvoice) to pass a transaction
// client so the invoice insert, its company/contact associations, and every
// line item it creates all participate in one outer transaction — mirrors
// history.repository.ts's DbClient/create() pattern.
export type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AssociatedCompany = {
  id: string;
  name: string | null;
  domain: string | null;
  website: string | null;
};

export type AssociatedDeal = {
  id: string;
  dealname: string | null;
  amount: string | null;
  closedate: Date | null;
};

export type AssociatedContact = {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  jobtitle: string | null;
  company: string | null;
};

export type AssociatedPayment = {
  id: string;
  hsPaymentId: string | null;
  hsInitialAmount: string | null;
  hsNetAmount: string | null;
  hsCurrencyCode: string | null;
  hsLatestStatus: string | null;
  hsPaymentMethodType: string | null;
  hsInitiatedDate: Date | null;
};

export type AssociatedCreditMemo = {
  id: string;
  hsNumber: string | null;
  hsCreditMemoStatus: string | null;
  hsAmountCredited: string | null;
  hsCurrency: string | null;
  hsCreditMemoDate: Date | null;
  hsComments: string | null;
};

const INVOICE_FIELDS = {
  id: invoice.id,
  hubspotId: invoice.hubspotId,
  archived: invoice.archived,
  hsNumber: invoice.hsNumber,
  hsInvoiceStatus: invoice.hsInvoiceStatus,
  tenant: invoice.tenant,
  hsDueDate: invoice.hsDueDate,
  hsAmountPaid: invoice.hsAmountPaid,
  hsAmountBilled: invoice.hsAmountBilled,
  hsBalanceDue: invoice.hsBalanceDue,
  hsCurrency: invoice.hsCurrency,
  hsBillingFrequencyType: invoice.hsBillingFrequencyType,
  mspLevel: invoice.mspLevel,
  typeObj: invoice.typeObj,
  hsNetPaymentTerm: invoice.hsNetPaymentTerm,
  hsInvoiceSource: invoice.hsInvoiceSource,
  hsInvoiceDate: invoice.hsInvoiceDate,
  hsInvoiceLatestCompanyName: invoice.hsInvoiceLatestCompanyName,
  hsInvoiceLatestContactEmail: invoice.hsInvoiceLatestContactEmail,
  hsInvoiceLatestContactFirstname: invoice.hsInvoiceLatestContactFirstname,
  hsInvoiceLatestContactLastname: invoice.hsInvoiceLatestContactLastname,
  hsRecipientCompanyAddress: invoice.hsRecipientCompanyAddress,
  hsRecipientCompanyCity: invoice.hsRecipientCompanyCity,
  hsRecipientCompanyState: invoice.hsRecipientCompanyState,
  hsRecipientCompanyCountry: invoice.hsRecipientCompanyCountry,
  hsRecipientCompanyZip: invoice.hsRecipientCompanyZip,
  installmentNumber: invoice.installmentNumber,
  installmentTotal: invoice.installmentTotal,
  createdAt: invoice.createdAt,
  updatedAt: invoice.updatedAt,
};

const invoiceColumns = {
  hubspotId: invoice.hubspotId,
  hubspotOwnerId: invoice.hubspotOwnerId,
};

export async function findAll(
  page: number,
  limit: number,
  search?: string,
  status?: string,
  type?: string,
  scope?: RecordAccessScope,
): Promise<PaginatedResult<Invoice>> {
  const where = and(
    eq(invoice.archived, false),
    status ? eq(invoice.hsInvoiceStatus, status) : undefined,
    type ? eq(invoice.typeObj, type) : undefined,
    search
      ? or(
          ilike(invoice.hsNumber, `%${search}%`),
          ilike(invoice.tenant, `%${search}%`),
          ilike(invoice.hsInvoiceLatestCompanyName, `%${search}%`),
          ilike(invoice.hsInvoiceLatestContactFirstname, `%${search}%`),
          ilike(invoice.hsInvoiceLatestContactLastname, `%${search}%`),
        )
      : undefined,
    scopeCondition(scope, "invoices", invoiceColumns),
  );

  const [data, countResult] = await Promise.all([
    db
      .select(INVOICE_FIELDS)
      .from(invoice)
      .where(where)
      .orderBy(sql`${invoice.hsDueDate} DESC`)
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(invoice).where(where),
  ]);

  return { data, total: Number(countResult[0].count), page, limit };
}

const LINE_ITEM_FIELDS = {
  id: lineItem.id,
  name: lineItem.name,
  description: lineItem.description,
  quantity: lineItem.quantity,
  price: lineItem.price,
  amount: lineItem.amount,
  module: lineItem.module,
  groupLicense: lineItem.groupLicense,
  customerName: lineItem.customerName,
  recurringbillingfrequency: lineItem.recurringbillingfrequency,
  hsLineItemCurrencyCode: lineItem.hsLineItemCurrencyCode,
  hsDiscountPercentage: lineItem.hsDiscountPercentage,
  discount: lineItem.discount,
  discountType: lineItem.discountType,
  hsEffectiveUnitPrice: lineItem.hsEffectiveUnitPrice,
  hsPositionOnQuote: lineItem.hsPositionOnQuote,
};

export async function findLineItemsByInvoice(invoiceId: string, tx: DbClient = db): Promise<LineItem[]> {
  return tx
    .selectDistinct(LINE_ITEM_FIELDS)
    .from(invoice)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "invoices"),
        eq(dynamicAssociation.fromHubspotId, invoice.hubspotId),
        eq(dynamicAssociation.toObjectType, "line_items"),
      ),
    )
    .innerJoin(lineItem, eq(lineItem.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(invoice.id, invoiceId), eq(lineItem.archived, false)))
    .orderBy(asc(lineItem.hsPositionOnQuote));
}

export type CloneableLineItem = {
  hsProductId: string | null;
  name: string | null;
  description: string | null;
  customerName: string | null;
  quantity: string | null;
  price: string | null;
  hsDiscountPercentage: string | null;
  discount: string | null;
  discountType: string | null;
  hsPositionOnQuote: string | null;
};

const CLONEABLE_LINE_ITEM_FIELDS = {
  hsProductId: lineItem.hsProductId,
  name: lineItem.name,
  description: lineItem.description,
  customerName: lineItem.customerName,
  quantity: lineItem.quantity,
  price: lineItem.price,
  hsDiscountPercentage: lineItem.hsDiscountPercentage,
  discount: lineItem.discount,
  discountType: lineItem.discountType,
  // Postgres requires every ORDER BY expression to appear in the SELECT
  // DISTINCT list — included here (unused by clone logic itself) purely to
  // satisfy that and keep the ordering below valid.
  hsPositionOnQuote: lineItem.hsPositionOnQuote,
};

// Same join as findLineItemsByInvoice, but exposes hsProductId so invoice
// cloning can re-resolve each line item's source product (LINE_ITEM_FIELDS
// intentionally omits it since no other read path needs it).
export async function findLineItemsForClone(invoiceId: string, tx: DbClient = db): Promise<CloneableLineItem[]> {
  return tx
    .selectDistinct(CLONEABLE_LINE_ITEM_FIELDS)
    .from(invoice)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "invoices"),
        eq(dynamicAssociation.fromHubspotId, invoice.hubspotId),
        eq(dynamicAssociation.toObjectType, "line_items"),
      ),
    )
    .innerJoin(lineItem, eq(lineItem.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(invoice.id, invoiceId), eq(lineItem.archived, false)))
    .orderBy(asc(lineItem.hsPositionOnQuote));
}

export async function findAssociatedCompanies(invoiceId: string): Promise<AssociatedCompany[]> {
  return db
    .selectDistinct({
      id: company.id,
      name: company.name,
      domain: company.domain,
      website: company.website,
    })
    .from(invoice)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "invoices"),
        eq(dynamicAssociation.fromHubspotId, invoice.hubspotId),
        eq(dynamicAssociation.toObjectType, "companies"),
      ),
    )
    .innerJoin(company, eq(company.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(invoice.id, invoiceId), eq(company.archived, false)));
}

export async function findAssociatedContacts(invoiceId: string): Promise<AssociatedContact[]> {
  return db
    .selectDistinct({
      id: contact.id,
      firstname: contact.firstname,
      lastname: contact.lastname,
      email: contact.email,
      jobtitle: contact.jobtitle,
      company: contact.company,
    })
    .from(invoice)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "invoices"),
        eq(dynamicAssociation.fromHubspotId, invoice.hubspotId),
        eq(dynamicAssociation.toObjectType, "contacts"),
      ),
    )
    .innerJoin(contact, eq(contact.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(invoice.id, invoiceId), eq(contact.archived, false)));
}

export async function findAssociatedDeals(invoiceId: string): Promise<AssociatedDeal[]> {
  return db
    .selectDistinct({
      id: deal.id,
      dealname: deal.dealname,
      amount: deal.amount,
      closedate: deal.closedate,
    })
    .from(invoice)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "invoices"),
        eq(dynamicAssociation.fromHubspotId, invoice.hubspotId),
        eq(dynamicAssociation.toObjectType, "deals"),
      ),
    )
    .innerJoin(deal, eq(deal.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(invoice.id, invoiceId), eq(deal.archived, false)));
}

export async function findAssociatedPayments(invoiceId: string): Promise<AssociatedPayment[]> {
  return db
    .selectDistinct({
      id: payment.id,
      hsPaymentId: payment.hsPaymentId,
      hsInitialAmount: payment.hsInitialAmount,
      hsNetAmount: payment.hsNetAmount,
      hsCurrencyCode: payment.hsCurrencyCode,
      hsLatestStatus: payment.hsLatestStatus,
      hsPaymentMethodType: payment.hsPaymentMethodType,
      hsInitiatedDate: payment.hsInitiatedDate,
    })
    .from(invoice)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "invoices"),
        eq(dynamicAssociation.fromHubspotId, invoice.hubspotId),
        eq(dynamicAssociation.toObjectType, "payments"),
      ),
    )
    .innerJoin(payment, eq(payment.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(invoice.id, invoiceId), eq(payment.archived, false)));
}

export async function findAssociatedCreditMemos(invoiceId: string): Promise<AssociatedCreditMemo[]> {
  return db
    .selectDistinct({
      id: creditMemoLite.id,
      hsNumber: creditMemoLite.hsNumber,
      hsCreditMemoStatus: creditMemoLite.hsCreditMemoStatus,
      hsAmountCredited: creditMemoLite.hsAmountCredited,
      hsCurrency: creditMemoLite.hsCurrency,
      hsCreditMemoDate: creditMemoLite.hsCreditMemoDate,
      hsComments: creditMemoLite.hsComments,
    })
    .from(invoice)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "invoices"),
        eq(dynamicAssociation.fromHubspotId, invoice.hubspotId),
        eq(dynamicAssociation.toObjectType, "credit_memos"),
      ),
    )
    .innerJoin(creditMemoLite, eq(creditMemoLite.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(invoice.id, invoiceId), eq(creditMemoLite.archived, false)));
}

// Used only by getInvoiceById's adjustedBalanceDue, for credit memos that are
// dynamic_associations-linked to this invoice (e.g. created via POST
// /credit-memos with an originating invoiceId) but have no corresponding
// credit_memo_applications row yet — i.e. genuinely not-yet-applied credit.
// Memos that DO have an application are deliberately excluded here: since
// createCreditMemoApplication now also creates that same dynamic_associations
// link (see below, so the memo shows up in both records' association
// panels), counting them here too would double-subtract them — they're
// already reflected in hsBalanceDue via sumCreditMemoApplicationsForInvoice.
export async function sumCreditMemosForInvoice(invoiceId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${creditMemoLite.hsAmountCredited}), 0)` })
    .from(invoice)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "invoices"),
        eq(dynamicAssociation.fromHubspotId, invoice.hubspotId),
        eq(dynamicAssociation.toObjectType, "credit_memos"),
      ),
    )
    .innerJoin(creditMemoLite, eq(creditMemoLite.hubspotId, dynamicAssociation.toHubspotId))
    .where(
      and(
        eq(invoice.id, invoiceId),
        eq(creditMemoLite.archived, false),
        notExists(
          db
            .select({ one: sql`1` })
            .from(creditMemoApplication)
            .where(and(eq(creditMemoApplication.invoiceId, invoiceId), eq(creditMemoApplication.creditMemoId, creditMemoLite.id))),
        ),
      ),
    );
  return Number(rows[0]?.total ?? 0);
}

// Only 'succeeded' payments count toward what's actually been paid — matches
// how payment.repository.ts's create() always stamps a natively-registered
// payment as 'succeeded' (there's no pending/failed state in this flow).
export async function sumPaymentsForInvoice(invoiceId: string, tx: DbClient = db): Promise<number> {
  const rows = await tx
    .select({ total: sql<number>`coalesce(sum(coalesce(${payment.hsNetAmount}, ${payment.hsInitialAmount}, 0)), 0)` })
    .from(invoice)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "invoices"),
        eq(dynamicAssociation.fromHubspotId, invoice.hubspotId),
        eq(dynamicAssociation.toObjectType, "payments"),
      ),
    )
    .innerJoin(payment, eq(payment.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(invoice.id, invoiceId), eq(payment.archived, false), eq(payment.hsLatestStatus, "succeeded")));
  return Number(rows[0]?.total ?? 0);
}

export async function findById(id: string, scope?: RecordAccessScope, tx: DbClient = db): Promise<Invoice | null> {
  const rows = await tx
    .select(INVOICE_FIELDS)
    .from(invoice)
    .where(and(eq(invoice.id, id), eq(invoice.archived, false), scopeCondition(scope, "invoices", invoiceColumns)))
    .limit(1);
  return rows[0] ?? null;
}

// Invoice numbers follow the "INV-<n>" convention already present in synced
// HubSpot data (e.g. INV-4568) — the next one is just the highest existing
// numeric suffix + 1, so natively-created invoices keep counting up from
// wherever the synced data left off. Falls back to INV-1 when there are no
// numbered invoices yet.
export async function getNextInvoiceNumber(tx: DbClient = db): Promise<string> {
  const rows = await tx.select({ hsNumber: invoice.hsNumber }).from(invoice);
  let max = 0;
  for (const row of rows) {
    const match = row.hsNumber?.match(/^INV-(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `INV-${max + 1}`;
}

// Denormalized display fields the list page, detail page, and public preview
// all read directly off the invoice row (the preview page in particular has
// no other way to get at company/contact — it only ever fetches the invoice
// itself, never the association endpoints) — so every write path that
// (re-)points an invoice's company/contact must keep these in sync, not just
// the dynamic_associations rows.
export type RecipientSnapshotInput = {
  companyName: string | null;
  companyAddress: string | null;
  companyCity: string | null;
  companyState: string | null;
  companyCountry: string | null;
  companyZip: string | null;
  contactEmail: string | null;
  contactFirstname: string | null;
  contactLastname: string | null;
};

export type CreateInvoiceRepoInput = CreateInvoiceInput &
  RecipientSnapshotInput & {
    companyHubspotId: string;
    contactHubspotId: string;
    mspLevel: string | null;
  };

// Mirrors payment.repository.ts's create(): invoices/companies/contacts have
// no FK between them, only dynamic_associations matched on hubspot_id text
// columns, so a natively-created invoice needs a synthetic hubspotId before
// it can be associated to anything.
export async function create(input: CreateInvoiceRepoInput, tx: DbClient = db): Promise<Invoice> {
  const id = randomUUID();
  const hubspotId = `local-${id}`;

  await tx.insert(invoice).values({
    id,
    hubspotId,
    archived: false,
    // Real sequential numbers are only assigned at publish time (see
    // invoice.service.ts's publishInvoice) — otherwise concurrent drafts in
    // progress would burn/reserve numbers that might never be finished.
    hsNumber: "INV-DRAFT",
    hsInvoiceStatus: "draft",
    hsAmountBilled: "0",
    hsInvoiceDate: input.hsInvoiceDate,
    hsDueDate: input.hsDueDate,
    hsNetPaymentTerm: input.hsNetPaymentTerm !== undefined ? String(input.hsNetPaymentTerm) : null,
    typeObj: input.typeObj,
    mspLevel: input.mspLevel,
    tenant: input.tenant ?? null,
    hsCurrency: input.hsCurrency,
    installmentNumber: input.installmentNumber ?? null,
    installmentTotal: input.installmentTotal ?? null,
    hsInvoiceLatestCompanyName: input.companyName,
    hsInvoiceLatestContactEmail: input.contactEmail,
    hsInvoiceLatestContactFirstname: input.contactFirstname,
    hsInvoiceLatestContactLastname: input.contactLastname,
    hsRecipientCompanyAddress: input.companyAddress,
    hsRecipientCompanyCity: input.companyCity,
    hsRecipientCompanyState: input.companyState,
    hsRecipientCompanyCountry: input.companyCountry,
    hsRecipientCompanyZip: input.companyZip,
  });

  await tx.insert(dynamicAssociation).values([
    {
      fromObjectType: "invoices",
      fromHubspotId: hubspotId,
      toObjectType: "companies",
      toHubspotId: input.companyHubspotId,
      associationLabel: "invoice_to_company",
    },
    {
      fromObjectType: "companies",
      fromHubspotId: input.companyHubspotId,
      toObjectType: "invoices",
      toHubspotId: hubspotId,
      associationLabel: "company_to_invoice",
    },
    {
      fromObjectType: "invoices",
      fromHubspotId: hubspotId,
      toObjectType: "contacts",
      toHubspotId: input.contactHubspotId,
      associationLabel: "invoice_to_contact",
    },
    {
      fromObjectType: "contacts",
      fromHubspotId: input.contactHubspotId,
      toObjectType: "invoices",
      toHubspotId: hubspotId,
      associationLabel: "contact_to_invoice",
    },
  ]);

  const rows = await tx.select(INVOICE_FIELDS).from(invoice).where(eq(invoice.id, id)).limit(1);
  return rows[0];
}

export async function update(id: string, input: UpdateInvoiceInput, scope?: RecordAccessScope, tx: DbClient = db): Promise<Invoice | null> {
  const where = and(eq(invoice.id, id), scopeCondition(scope, "invoices", invoiceColumns));
  await tx
    .update(invoice)
    .set({ ...input, updatedAt: new Date() })
    .where(where);
  const rows = await tx.select(INVOICE_FIELDS).from(invoice).where(where).limit(1);
  return rows[0] ?? null;
}

export type UpdateInvoiceDetailsRepoInput = UpdateInvoiceDetailsInput &
  RecipientSnapshotInput & {
    companyHubspotId: string;
    contactHubspotId: string;
    mspLevel: string | null;
  };

// Re-points the invoice's company/contact associations (old pair removed,
// new pair inserted — same bidirectional shape as create()) and updates the
// remaining invoice-level fields. Line items are intentionally untouched
// here; the edit form diffs and mutates them individually via
// createLineItem/updateLineItem/removeLineItem instead.
export async function updateDetails(
  id: string,
  input: UpdateInvoiceDetailsRepoInput,
  tx: DbClient = db,
  scope?: RecordAccessScope,
): Promise<Invoice | null> {
  const current = await tx
    .select(INVOICE_FIELDS)
    .from(invoice)
    .where(and(eq(invoice.id, id), eq(invoice.archived, false), scopeCondition(scope, "invoices", invoiceColumns)))
    .limit(1);
  const existing = current[0];
  if (!existing || !existing.hubspotId) return null;

  await tx
    .delete(dynamicAssociation)
    .where(
      or(
        and(
          eq(dynamicAssociation.fromObjectType, "invoices"),
          eq(dynamicAssociation.fromHubspotId, existing.hubspotId),
          eq(dynamicAssociation.toObjectType, "companies"),
        ),
        and(
          eq(dynamicAssociation.fromObjectType, "companies"),
          eq(dynamicAssociation.toObjectType, "invoices"),
          eq(dynamicAssociation.toHubspotId, existing.hubspotId),
        ),
      ),
    );
  await tx
    .delete(dynamicAssociation)
    .where(
      or(
        and(
          eq(dynamicAssociation.fromObjectType, "invoices"),
          eq(dynamicAssociation.fromHubspotId, existing.hubspotId),
          eq(dynamicAssociation.toObjectType, "contacts"),
        ),
        and(
          eq(dynamicAssociation.fromObjectType, "contacts"),
          eq(dynamicAssociation.toObjectType, "invoices"),
          eq(dynamicAssociation.toHubspotId, existing.hubspotId),
        ),
      ),
    );

  await tx.insert(dynamicAssociation).values([
    {
      fromObjectType: "invoices",
      fromHubspotId: existing.hubspotId,
      toObjectType: "companies",
      toHubspotId: input.companyHubspotId,
      associationLabel: "invoice_to_company",
    },
    {
      fromObjectType: "companies",
      fromHubspotId: input.companyHubspotId,
      toObjectType: "invoices",
      toHubspotId: existing.hubspotId,
      associationLabel: "company_to_invoice",
    },
    {
      fromObjectType: "invoices",
      fromHubspotId: existing.hubspotId,
      toObjectType: "contacts",
      toHubspotId: input.contactHubspotId,
      associationLabel: "invoice_to_contact",
    },
    {
      fromObjectType: "contacts",
      fromHubspotId: input.contactHubspotId,
      toObjectType: "invoices",
      toHubspotId: existing.hubspotId,
      associationLabel: "contact_to_invoice",
    },
  ]);

  await tx
    .update(invoice)
    .set({
      hsInvoiceDate: input.hsInvoiceDate,
      hsDueDate: input.hsDueDate,
      hsNetPaymentTerm: input.hsNetPaymentTerm !== undefined ? String(input.hsNetPaymentTerm) : null,
      typeObj: input.typeObj,
      mspLevel: input.mspLevel,
      tenant: input.tenant ?? null,
      hsCurrency: input.hsCurrency,
      installmentNumber: input.installmentNumber ?? null,
      installmentTotal: input.installmentTotal ?? null,
      hsInvoiceLatestCompanyName: input.companyName,
      hsInvoiceLatestContactEmail: input.contactEmail,
      hsInvoiceLatestContactFirstname: input.contactFirstname,
      hsInvoiceLatestContactLastname: input.contactLastname,
      hsRecipientCompanyAddress: input.companyAddress,
      hsRecipientCompanyCity: input.companyCity,
      hsRecipientCompanyState: input.companyState,
      hsRecipientCompanyCountry: input.companyCountry,
      hsRecipientCompanyZip: input.companyZip,
      updatedAt: new Date(),
    })
    .where(eq(invoice.id, id));

  const rows = await tx.select(INVOICE_FIELDS).from(invoice).where(eq(invoice.id, id)).limit(1);
  return rows[0] ?? null;
}

// Soft-archive, matching product.repository.ts's remove() — this codebase
// never hard-deletes records.
export async function remove(id: string, scope?: RecordAccessScope): Promise<boolean> {
  const [result] = await db
    .update(invoice)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(invoice.id, id), scopeCondition(scope, "invoices", invoiceColumns)));
  return result.affectedRows > 0;
}

// line_items has no FK to its parent invoice at all — association is
// entirely through dynamic_associations, matched on hubspot_id text columns
// (see findLineItemsByInvoice above). A newly-created line item needs a
// synthetic hubspotId before it can be joined, mirroring the
// payment.repository.ts create() pattern.
export async function createLineItem(invoiceRow: Invoice, input: CreateLineItemInput, tx: DbClient = db): Promise<LineItem> {
  if (!invoiceRow.hubspotId) {
    throw new Error("Invoice is missing a hubspotId — cannot associate a line item with it");
  }

  const productRows = await tx
    .select({
      name: product.name,
      description: product.description,
      hsPriceUsd: product.hsPriceUsd,
      recurringbillingfrequency: product.recurringbillingfrequency,
      module: product.module,
      groupLicense: product.groupLicense,
      hsProductType: product.hsProductType,
      hsObjectId: product.hsObjectId,
    })
    .from(product)
    .where(and(eq(product.id, input.productId), eq(product.archived, false)))
    .limit(1);
  const prod = productRows[0];
  if (!prod) throw new Error("Product not found");

  const price = input.price ?? Number(prod.hsPriceUsd ?? 0);
  const discountType: InvoiceDiscountKind = input.discountType ?? "percentage";
  const discountPct = discountType === "percentage" ? input.hsDiscountPercentage ?? 0 : 0;
  const discountAmount = discountType === "amount" ? input.discount ?? 0 : 0;
  const effectiveUnitPrice = discountType === "amount" ? Math.max(0, price - discountAmount) : price * (1 - discountPct / 100);
  const amount = effectiveUnitPrice * input.quantity;
  const id = randomUUID();
  const hubspotId = `local-${id}`;

  await tx.insert(lineItem).values({
    id,
    hubspotId,
    archived: false,
    name: input.name ?? prod.name,
    description: input.description ?? prod.description,
    customerName: input.customerName ?? null,
    price: String(price),
    quantity: String(input.quantity),
    amount: String(amount),
    discountType,
    hsDiscountPercentage: discountType === "percentage" ? String(discountPct) : null,
    discount: discountType === "amount" ? String(discountAmount) : null,
    hsEffectiveUnitPrice: String(effectiveUnitPrice),
    module: prod.module,
    groupLicense: prod.groupLicense,
    recurringbillingfrequency: prod.recurringbillingfrequency,
    hsProductType: prod.hsProductType,
    hsProductId: prod.hsObjectId,
    hsLineItemCurrencyCode: invoiceRow.hsCurrency,
  });

  await tx.insert(dynamicAssociation).values([
    {
      fromObjectType: "invoices",
      fromHubspotId: invoiceRow.hubspotId,
      toObjectType: "line_items",
      toHubspotId: hubspotId,
      associationLabel: "invoice_to_line_item",
    },
    {
      fromObjectType: "line_items",
      fromHubspotId: hubspotId,
      toObjectType: "invoices",
      toHubspotId: invoiceRow.hubspotId,
      associationLabel: "line_item_to_invoice",
    },
  ]);

  const rows = await tx.select(LINE_ITEM_FIELDS).from(lineItem).where(eq(lineItem.id, id)).limit(1);
  return rows[0];
}

// Which invoice a line item belongs to, via the reverse dynamic_associations
// direction inserted by createLineItem — used to enforce the open/draft-only
// edit guard on individual line-item mutations.
export async function findInvoiceIdForLineItem(lineItemId: string): Promise<string | null> {
  const rows = await db
    .select({ invoiceId: invoice.id })
    .from(lineItem)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "line_items"),
        eq(dynamicAssociation.fromHubspotId, lineItem.hubspotId),
        eq(dynamicAssociation.toObjectType, "invoices"),
      ),
    )
    .innerJoin(invoice, eq(invoice.hubspotId, dynamicAssociation.toHubspotId))
    .where(eq(lineItem.id, lineItemId))
    .limit(1);
  return rows[0]?.invoiceId ?? null;
}

export async function updateLineItem(id: string, input: UpdateLineItemInput): Promise<LineItem | null> {
  const current = await db.select(LINE_ITEM_FIELDS).from(lineItem).where(eq(lineItem.id, id)).limit(1);
  const existing = current[0];
  if (!existing) return null;

  const quantity = input.quantity ?? Number(existing.quantity ?? 1);
  const price = input.price ?? Number(existing.price ?? 0);
  const discountType: InvoiceDiscountKind = (input.discountType ?? existing.discountType) === "amount" ? "amount" : "percentage";
  const discountPct =
    input.hsDiscountPercentage !== undefined ? input.hsDiscountPercentage ?? 0 : Number(existing.hsDiscountPercentage ?? 0);
  const discountAmount = input.discount !== undefined ? input.discount ?? 0 : Number(existing.discount ?? 0);
  const effectiveUnitPrice = discountType === "amount" ? Math.max(0, price - discountAmount) : price * (1 - discountPct / 100);
  const amount = effectiveUnitPrice * quantity;

  await db
    .update(lineItem)
    .set({
      ...(input.quantity !== undefined ? { quantity: String(input.quantity) } : {}),
      ...(input.price !== undefined ? { price: String(input.price) } : {}),
      ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
      ...(input.hsDiscountPercentage !== undefined
        ? { hsDiscountPercentage: input.hsDiscountPercentage === null ? null : String(input.hsDiscountPercentage) }
        : {}),
      ...(input.discount !== undefined ? { discount: input.discount === null ? null : String(input.discount) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.customerName !== undefined ? { customerName: input.customerName } : {}),
      hsEffectiveUnitPrice: String(effectiveUnitPrice),
      amount: String(amount),
      updatedAt: new Date(),
    })
    .where(eq(lineItem.id, id));
  const rows = await db.select(LINE_ITEM_FIELDS).from(lineItem).where(eq(lineItem.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function removeLineItem(id: string): Promise<boolean> {
  const [result] = await db
    .update(lineItem)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(lineItem.id, id));
  return result.affectedRows > 0;
}

const DISCOUNT_FIELDS = {
  id: invoiceDiscount.id,
  invoiceId: invoiceDiscount.invoiceId,
  name: invoiceDiscount.name,
  kind: invoiceDiscount.kind,
  value: invoiceDiscount.value,
  sortOrder: invoiceDiscount.sortOrder,
};

export async function findDiscountsByInvoice(invoiceId: string, tx: DbClient = db): Promise<InvoiceDiscount[]> {
  const rows = await tx
    .select(DISCOUNT_FIELDS)
    .from(invoiceDiscount)
    .where(eq(invoiceDiscount.invoiceId, invoiceId))
    .orderBy(asc(invoiceDiscount.sortOrder), asc(invoiceDiscount.createdAt));
  return rows as InvoiceDiscount[];
}

export async function createDiscount(invoiceId: string, input: CreateInvoiceDiscountInput, tx: DbClient = db): Promise<InvoiceDiscount> {
  const id = randomUUID();
  const [{ maxOrder }] = await tx
    .select({ maxOrder: sql<number>`coalesce(max(${invoiceDiscount.sortOrder}), -1)` })
    .from(invoiceDiscount)
    .where(eq(invoiceDiscount.invoiceId, invoiceId));

  await tx.insert(invoiceDiscount).values({
    id,
    invoiceId,
    name: input.name,
    kind: input.kind,
    value: String(input.value),
    sortOrder: Number(maxOrder) + 1,
  });

  const rows = await tx.select(DISCOUNT_FIELDS).from(invoiceDiscount).where(eq(invoiceDiscount.id, id)).limit(1);
  return rows[0] as InvoiceDiscount;
}

export async function updateDiscount(invoiceId: string, id: string, input: UpdateInvoiceDiscountInput): Promise<InvoiceDiscount | null> {
  const where = and(eq(invoiceDiscount.id, id), eq(invoiceDiscount.invoiceId, invoiceId));
  await db
    .update(invoiceDiscount)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.value !== undefined ? { value: String(input.value) } : {}),
      updatedAt: new Date(),
    })
    .where(where);
  const rows = await db.select(DISCOUNT_FIELDS).from(invoiceDiscount).where(where).limit(1);
  return (rows[0] as InvoiceDiscount) ?? null;
}

export async function removeDiscount(invoiceId: string, id: string): Promise<boolean> {
  const [result] = await db
    .delete(invoiceDiscount)
    .where(and(eq(invoiceDiscount.id, id), eq(invoiceDiscount.invoiceId, invoiceId)));
  return result.affectedRows > 0;
}

const CREDIT_MEMO_APPLICATION_FIELDS = {
  id: creditMemoApplication.id,
  invoiceId: creditMemoApplication.invoiceId,
  creditMemoId: creditMemoApplication.creditMemoId,
  amount: creditMemoApplication.amount,
};

export async function findCreditMemoApplications(invoiceId: string, tx: DbClient = db): Promise<CreditMemoApplication[]> {
  const rows = await tx
    .select(CREDIT_MEMO_APPLICATION_FIELDS)
    .from(creditMemoApplication)
    .where(eq(creditMemoApplication.invoiceId, invoiceId));
  return rows as CreditMemoApplication[];
}

// A credit memo's available balance, live: hsAmountCredited minus every
// existing application of it, optionally excluding one application row (used
// when updating that same row, so its own prior amount doesn't count against
// itself).
async function creditMemoAvailableBalance(creditMemoId: string, excludeApplicationId: string | undefined, tx: DbClient): Promise<number> {
  const memoRows = await tx
    .select({ hsAmountCredited: creditMemoLite.hsAmountCredited })
    .from(creditMemoLite)
    .where(eq(creditMemoLite.id, creditMemoId))
    .limit(1);
  const credited = Number(memoRows[0]?.hsAmountCredited) || 0;

  const appliedRows = await tx
    .select({ total: sql<string>`coalesce(sum(${creditMemoApplication.amount}), 0)` })
    .from(creditMemoApplication)
    .where(
      and(
        eq(creditMemoApplication.creditMemoId, creditMemoId),
        excludeApplicationId ? sql`${creditMemoApplication.id} != ${excludeApplicationId}` : undefined,
      ),
    );
  const applied = Number(appliedRows[0]?.total ?? 0);
  // Rounded so applying the exact full remaining balance never gets
  // rejected by createCreditMemoApplication's `amount > available` check
  // over a sub-cent floating-point residue (see src/lib/money.ts).
  return roundMoney(credited - applied);
}

function creditExceedsBalance() {
  const err = new Error("Amount exceeds the credit memo's available balance") as Error & { statusCode?: number };
  err.statusCode = 422;
  return err;
}

export async function createCreditMemoApplication(
  invoiceId: string,
  input: CreateCreditMemoApplicationInput,
  tx: DbClient = db,
): Promise<CreditMemoApplication> {
  const available = await creditMemoAvailableBalance(input.creditMemoId, undefined, tx);
  if (input.amount > available) throw creditExceedsBalance();

  const id = randomUUID();
  await tx.insert(creditMemoApplication).values({
    id,
    invoiceId,
    creditMemoId: input.creditMemoId,
    amount: String(input.amount),
  });

  // Makes the credit memo show up in this invoice's Credit Memos panel (and
  // this invoice show up in the credit memo's Invoices panel) — both read
  // from dynamic_associations, not credit_memo_applications (see
  // findAssociatedCreditMemos / creditMemo.repository.ts's
  // findAssociatedInvoice). Same associationLabel strings
  // creditMemo.repository.ts's own create() already uses when a memo is
  // created with an originating invoice, so either path lands on the same
  // link. .ignore() + the table's uniq_dynamic_assoc index makes this a
  // no-op if the pair is already linked (e.g. a second application between
  // the same invoice and credit memo, or the memo was already linked at
  // creation time).
  const [invoiceRow] = await tx.select({ hubspotId: invoice.hubspotId }).from(invoice).where(eq(invoice.id, invoiceId)).limit(1);
  const [memoRow] = await tx.select({ hubspotId: creditMemoLite.hubspotId }).from(creditMemoLite).where(eq(creditMemoLite.id, input.creditMemoId)).limit(1);
  if (invoiceRow?.hubspotId && memoRow?.hubspotId) {
    await tx
      .insert(dynamicAssociation)
      .ignore()
      .values([
        {
          fromObjectType: "invoices",
          fromHubspotId: invoiceRow.hubspotId,
          toObjectType: "credit_memos",
          toHubspotId: memoRow.hubspotId,
          associationLabel: "invoice_to_credit_memo",
        },
        {
          fromObjectType: "credit_memos",
          fromHubspotId: memoRow.hubspotId,
          toObjectType: "invoices",
          toHubspotId: invoiceRow.hubspotId,
          associationLabel: "credit_memo_to_invoice",
        },
      ]);
  }

  const rows = await tx.select(CREDIT_MEMO_APPLICATION_FIELDS).from(creditMemoApplication).where(eq(creditMemoApplication.id, id)).limit(1);
  return rows[0] as CreditMemoApplication;
}

export async function updateCreditMemoApplication(
  invoiceId: string,
  id: string,
  input: UpdateCreditMemoApplicationInput,
): Promise<CreditMemoApplication | null> {
  const existingRows = await db
    .select(CREDIT_MEMO_APPLICATION_FIELDS)
    .from(creditMemoApplication)
    .where(and(eq(creditMemoApplication.id, id), eq(creditMemoApplication.invoiceId, invoiceId)))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) return null;

  const available = await creditMemoAvailableBalance(existing.creditMemoId, id, db);
  if (input.amount > available) throw creditExceedsBalance();

  const where = and(eq(creditMemoApplication.id, id), eq(creditMemoApplication.invoiceId, invoiceId));
  await db
    .update(creditMemoApplication)
    .set({ amount: String(input.amount), updatedAt: new Date() })
    .where(where);
  const rows = await db.select(CREDIT_MEMO_APPLICATION_FIELDS).from(creditMemoApplication).where(where).limit(1);
  return (rows[0] as CreditMemoApplication) ?? null;
}

export async function removeCreditMemoApplication(invoiceId: string, id: string): Promise<boolean> {
  const [result] = await db
    .delete(creditMemoApplication)
    .where(and(eq(creditMemoApplication.id, id), eq(creditMemoApplication.invoiceId, invoiceId)));
  return result.affectedRows > 0;
}

async function sumCreditMemoApplicationsForInvoice(invoiceId: string, tx: DbClient = db): Promise<number> {
  const rows = await tx
    .select({ total: sql<string>`coalesce(sum(${creditMemoApplication.amount}), 0)` })
    .from(creditMemoApplication)
    .where(eq(creditMemoApplication.invoiceId, invoiceId));
  return Number(rows[0]?.total ?? 0);
}

// Auto-transitions between 'open' and 'paid' as balance moves to/from zero —
// a credit memo application (or a real payment) fully covering the invoice
// is the same real-world outcome, so both drive the same status flip via
// this one shared function (see recalculateAmountBilled below). Deliberately
// leaves 'draft' and 'voided' alone regardless of balance: a draft hasn't
// been sent yet, and a voided invoice shouldn't come back to life just
// because its (now-irrelevant) balance happens to read 0. Requiring
// total > 0 avoids marking a $0 invoice "paid" the moment it's published,
// before anything has actually been applied to it. Both balanceDue and total
// are pre-rounded via roundMoney (see src/lib/money.ts) before reaching this
// function — floating-point summation of several line items routinely lands
// a hair off the "clean" decimal value (e.g. 124.45000000000002 instead of
// 124.45), which would otherwise make an invoice genuinely at $0 compute a
// balanceDue like 1.42e-14 and never trip the === 0 check below.
function nextInvoiceStatus(currentStatus: string | null, balanceDue: number, total: number): string | null {
  if (currentStatus === "open" && balanceDue === 0 && total > 0) return "paid";
  if (currentStatus === "paid" && balanceDue > 0) return "open";
  return currentStatus;
}

export async function recalculateAmountBilled(invoiceId: string, tx: DbClient = db): Promise<void> {
  const items = await findLineItemsByInvoice(invoiceId, tx);
  const lineItemsTotal = items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const discounts = await tx.select(DISCOUNT_FIELDS).from(invoiceDiscount).where(eq(invoiceDiscount.invoiceId, invoiceId));
  // Every global discount is computed off the same post-line-item-discount
  // total (not compounded through each other) - simpler to reason about and
  // to display than sequential/stacked percentages.
  const globalDiscountTotal = discounts.reduce((sum, d) => {
    const value = Number(d.value ?? 0);
    return sum + (d.kind === "percentage" ? lineItemsTotal * (value / 100) : value);
  }, 0);

  const total = roundMoney(Math.max(0, lineItemsTotal - globalDiscountTotal));
  // hsAmountPaid/hsBalanceDue are otherwise only ever populated by the
  // HubSpot sync — a natively-created (or cloned) invoice never had them set
  // at all, which made it look permanently "fully paid" (balance 0) the
  // moment it was created. Recomputed here too so a payment being
  // registered/edited/removed (see payment.service.ts's recalculateInvoiceAmounts
  // call) keeps this in sync going forward.
  const amountPaid = await sumPaymentsForInvoice(invoiceId, tx);
  // Credit memo applications reduce balance due the same way a payment does,
  // but never the amount actually billed — capped at 0 (never negative), per
  // product decision: an over-applied credit doesn't flip this invoice into
  // "we owe them" territory.
  const creditApplied = await sumCreditMemoApplicationsForInvoice(invoiceId, tx);
  const balanceDue = roundMoney(Math.max(0, total - amountPaid - creditApplied));

  const current = await tx.select({ status: invoice.hsInvoiceStatus }).from(invoice).where(eq(invoice.id, invoiceId)).limit(1);
  const status = nextInvoiceStatus(current[0]?.status ?? null, balanceDue, total);

  await tx
    .update(invoice)
    .set({
      hsAmountBilled: String(total),
      hsAmountPaid: String(amountPaid),
      hsBalanceDue: String(balanceDue),
      hsInvoiceStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(invoice.id, invoiceId));
}

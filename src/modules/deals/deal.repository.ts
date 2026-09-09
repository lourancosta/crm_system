import { randomUUID } from "crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { ilike } from "../../lib/sqlHelpers";
import { db } from "../../db/client";
import { contactLite as contact, quoteLite as quote } from "../../db/lightTables";
import { company, deal, dynamicAssociation, invoice } from "../../db/schema";
import { scopeCondition, type RecordAccessScope } from "../../lib/scopeFilter";
import type { BoardDeal, CreateDealInput, Deal, PaginatedResult, UpdateDealInput } from "./deal.types";

export type AssociatedCompany = {
  id: string;
  name: string | null;
  domain: string | null;
  website: string | null;
};

export type AssociatedContact = {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  jobtitle: string | null;
  company: string | null;
};

export type AssociatedQuote = {
  id: string;
  hsTitle: string | null;
  hsQuoteNumber: string | null;
  hsQuoteStatus: string | null;
  hsQuoteAmount: string | null;
  hsCurrency: string | null;
  hsExpirationDate: Date | null;
  isSigned: boolean;
  hsSignedDate: Date | null;
};

export type AssociatedInvoice = {
  id: string;
  hsNumber: string | null;
  hsInvoiceStatus: string | null;
  hsBalanceDue: string | null;
  hsCurrency: string | null;
  hsDueDate: Date | null;
};

const dealColumns = {
  hubspotId: deal.hubspotId,
  hubspotOwnerId: deal.hubspotOwnerId,
  createdByUserId: deal.createdByUserId,
};

export async function findAll(
  page: number,
  limit: number,
  search?: string,
  pipeline?: string,
  scope?: RecordAccessScope,
): Promise<PaginatedResult<Deal>> {
  const where = and(
    eq(deal.archived, false),
    search ? ilike(deal.dealname, `%${search}%`) : undefined,
    pipeline ? eq(deal.pipeline, pipeline) : undefined,
    scopeCondition(scope, "deals", dealColumns),
  );

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: deal.id,
        hubspotId: deal.hubspotId,
        archived: deal.archived,
        dealname: deal.dealname,
        closedate: deal.closedate,
        dealstage: deal.dealstage,
        pipeline: deal.pipeline,
        amount: deal.amount,
        certificationModules: deal.certificationModules,
        dealPartnerType: deal.dealPartnerType,
        controllerDealOwnerName: deal.controllerDealOwnerName,
        createdate: deal.createdate,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
      })
      .from(deal)
      .where(where)
      .orderBy(desc(deal.closedate))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(deal).where(where),
  ]);

  return { data, total: Number(countResult[0].count), page, limit };
}

export async function findById(id: string, scope?: RecordAccessScope): Promise<Deal | null> {
  const rows = await db
    .select({
      id: deal.id,
      hubspotId: deal.hubspotId,
      archived: deal.archived,
      dealname: deal.dealname,
      closedate: deal.closedate,
      dealstage: deal.dealstage,
      pipeline: deal.pipeline,
      amount: deal.amount,
      certificationModules: deal.certificationModules,
      dealPartnerType: deal.dealPartnerType,
      controllerDealOwnerName: deal.controllerDealOwnerName,
      createdate: deal.createdate,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    })
    .from(deal)
    .where(and(eq(deal.id, id), eq(deal.archived, false), scopeCondition(scope, "deals", dealColumns)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findAllForBoard(search?: string, scope?: RecordAccessScope): Promise<BoardDeal[]> {
  const where = and(
    eq(deal.archived, false),
    search ? ilike(deal.dealname, `%${search}%`) : undefined,
    scopeCondition(scope, "deals", dealColumns),
  );
  return db
    .select({
      id: deal.id,
      dealname: deal.dealname,
      amount: deal.amount,
      dealstage: deal.dealstage,
      pipeline: deal.pipeline,
      closedate: deal.closedate,
    })
    .from(deal)
    .where(where)
    .orderBy(desc(deal.closedate));
}

export async function create(input: CreateDealInput, createdByUserId?: string): Promise<Deal> {
  // Every native (non-HubSpot-synced) record needs a hubspotId so it can be
  // targeted by dynamic_associations joins — synthetic local-<uuid>
  // convention, same as quote.repository.ts's create(). Previously this was
  // only assigned for portal-created deals (createdByUserId set), which left
  // internal-admin-created deals unable to be associated with anything
  // (including a quote — quote.service.ts's createQuote requires it).
  const hubspotId = `local-${randomUUID()}`;
  const id = randomUUID();
  await db
    .insert(deal)
    .values({
      id,
      dealname: input.dealname,
      pipeline: input.pipeline,
      dealstage: input.dealstage,
      amount: input.amount,
      closedate: input.closedate ? new Date(input.closedate) : null,
      certificationModules: input.certificationModules,
      dealPartnerType: input.dealPartnerType,
      archived: false,
      hubspotId,
      createdByUserId,
    });
  const rows = await db.select().from(deal).where(eq(deal.id, id)).limit(1);
  return rows[0] as Deal;
}

// Links a newly created deal to the creator's company via the same
// dynamic_associations table every other CRM association already uses — no
// bespoke join table.
export async function associateWithCompany(dealHubspotId: string, companyHubspotId: string): Promise<void> {
  await db.insert(dynamicAssociation).values({
    fromObjectType: "deals",
    fromHubspotId: dealHubspotId,
    toObjectType: "companies",
    toHubspotId: companyHubspotId,
    associationLabel: "primary",
  });
}

export async function updateStage(id: string, stage: string, scope?: RecordAccessScope): Promise<Deal | null> {
  const where = and(eq(deal.id, id), eq(deal.archived, false), scopeCondition(scope, "deals", dealColumns));
  await db
    .update(deal)
    .set({ dealstage: stage, updatedAt: new Date() })
    .where(where);
  const rows = await db.select().from(deal).where(where).limit(1);
  return rows[0] ?? null;
}

export async function update(id: string, input: UpdateDealInput, scope?: RecordAccessScope): Promise<Deal | null> {
  const where = and(eq(deal.id, id), eq(deal.archived, false), scopeCondition(scope, "deals", dealColumns));
  await db
    .update(deal)
    .set({
      ...(input.dealname !== undefined ? { dealname: input.dealname } : {}),
      ...(input.dealstage !== undefined ? { dealstage: input.dealstage } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.closedate !== undefined ? { closedate: input.closedate ? new Date(input.closedate) : null } : {}),
      ...(input.certificationModules !== undefined ? { certificationModules: input.certificationModules } : {}),
      updatedAt: new Date(),
    })
    .where(where);
  const rows = await db
    .select({
      id: deal.id,
      hubspotId: deal.hubspotId,
      archived: deal.archived,
      dealname: deal.dealname,
      closedate: deal.closedate,
      dealstage: deal.dealstage,
      pipeline: deal.pipeline,
      amount: deal.amount,
      certificationModules: deal.certificationModules,
      dealPartnerType: deal.dealPartnerType,
      controllerDealOwnerName: deal.controllerDealOwnerName,
      createdate: deal.createdate,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    })
    .from(deal)
    .where(where)
    .limit(1);
  return rows[0] ?? null;
}

// Soft-archive, matching every other object's remove() in this codebase.
export async function remove(id: string, scope?: RecordAccessScope): Promise<boolean> {
  const [result] = await db
    .update(deal)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(deal.id, id), scopeCondition(scope, "deals", dealColumns)));
  return result.affectedRows > 0;
}

export async function findAssociatedCompanies(dealId: string): Promise<AssociatedCompany[]> {
  return db
    .selectDistinct({
      id: company.id,
      name: company.name,
      domain: company.domain,
      website: company.website,
    })
    .from(deal)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "deals"),
        eq(dynamicAssociation.fromHubspotId, deal.hubspotId),
        eq(dynamicAssociation.toObjectType, "companies"),
      ),
    )
    .innerJoin(company, eq(company.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(deal.id, dealId), eq(company.archived, false)));
}

export async function findAssociatedContacts(dealId: string): Promise<AssociatedContact[]> {
  return db
    .selectDistinct({
      id: contact.id,
      firstname: contact.firstname,
      lastname: contact.lastname,
      email: contact.email,
      jobtitle: contact.jobtitle,
      company: contact.company,
    })
    .from(deal)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "deals"),
        eq(dynamicAssociation.fromHubspotId, deal.hubspotId),
        eq(dynamicAssociation.toObjectType, "contacts"),
      ),
    )
    .innerJoin(contact, eq(contact.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(deal.id, dealId), eq(contact.archived, false)));
}

export async function findAssociatedQuotes(dealId: string): Promise<AssociatedQuote[]> {
  return db
    .selectDistinct({
      id: quote.id,
      hsTitle: quote.hsTitle,
      hsQuoteNumber: quote.hsQuoteNumber,
      hsQuoteStatus: quote.hsQuoteStatus,
      hsQuoteAmount: quote.hsQuoteAmount,
      hsCurrency: quote.hsCurrency,
      hsExpirationDate: quote.hsExpirationDate,
      // Same combined native-signing + HubSpot-synced-esign derivation as
      // quote.repository.ts's QUOTE_FIELDS.
      isSigned: sql<boolean>`(
        coalesce(quotes.is_signed, false) or quotes.hs_quote_status = 'SIGNED'
      )`,
      hsSignedDate: sql<Date | null>`coalesce(
        (select max(qs.signed_at) from quote_signers qs where qs.quote_id = quotes.id),
        quotes.signed_date
      )`,
    })
    .from(deal)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "deals"),
        eq(dynamicAssociation.fromHubspotId, deal.hubspotId),
        eq(dynamicAssociation.toObjectType, "quotes"),
      ),
    )
    .innerJoin(quote, eq(quote.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(deal.id, dealId), eq(quote.archived, false)));
}

export async function findAssociatedInvoices(dealId: string): Promise<AssociatedInvoice[]> {
  return db
    .selectDistinct({
      id: invoice.id,
      hsNumber: invoice.hsNumber,
      hsInvoiceStatus: invoice.hsInvoiceStatus,
      hsBalanceDue: invoice.hsBalanceDue,
      hsCurrency: invoice.hsCurrency,
      hsDueDate: invoice.hsDueDate,
    })
    .from(deal)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "deals"),
        eq(dynamicAssociation.fromHubspotId, deal.hubspotId),
        eq(dynamicAssociation.toObjectType, "invoices"),
      ),
    )
    .innerJoin(invoice, eq(invoice.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(deal.id, dealId), eq(invoice.archived, false)));
}

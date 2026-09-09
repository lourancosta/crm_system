import { randomUUID } from "crypto";
import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import { ilike } from "../../lib/sqlHelpers";
import { alias } from "drizzle-orm/mysql-core";
import { db } from "../../db/client";
import { contactLite, ticketLite } from "../../db/lightTables";
import { company, deal, dynamicAssociation, invoice, license } from "../../db/schema";
import { scopeCondition, type RecordAccessScope } from "../../lib/scopeFilter";
import type { Company, CreateCompanyInput, PaginatedResult, UpdateCompanyInput } from "./company.types";

const targetCompany = alias(company, "target_company");

// Maps the account type a partner/customer user is being created under to
// the actual dynamic.companies.type (HubSpot "Type") values that qualify —
// there's no plain "Partner"/"Customer" value in the real data, only these
// specific variants (confirmed against production data 2026-07-15).
const TYPE_VALUES_BY_ACCOUNT_TYPE: Record<string, string[]> = {
  partner: ["Partner Reseller/MSP", "Partner Reseller", "Partner MSP"],
  customer: ["Customer"],
};

const LICENSE_OBJECT_TYPE = "2-24278650";
const companyColumns = { hubspotId: company.hubspotId, hubspotOwnerId: company.hubspotOwnerId };

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

export type AssociatedDeal = {
  id: string;
  dealname: string | null;
  amount: string | null;
  closedate: Date | null;
};

export type AssociatedTicket = {
  id: string;
  subject: string | null;
  hsPipelineStage: string | null;
  hsTicketPriority: string | null;
  createdAt: Date;
};

export type AssociatedLicense = {
  id: string;
  name: string | null;
  status: string | null;
  customerName: string | null;
  expirationDate: Date | null;
};

export type AssociatedInvoice = {
  id: string;
  hsNumber: string | null;
  hsInvoiceStatus: string | null;
  hsBalanceDue: string | null;
  hsCurrency: string | null;
  hsDueDate: Date | null;
};

export async function findAll(
  page: number,
  limit: number,
  search?: string,
  scope?: RecordAccessScope,
  type?: string,
): Promise<PaginatedResult<Company>> {
  const typeValues = type ? TYPE_VALUES_BY_ACCOUNT_TYPE[type] : undefined;
  const where = and(
    eq(company.archived, false),
    search
      ? or(ilike(company.name, `%${search}%`), ilike(company.domain, `%${search}%`))
      : undefined,
    typeValues ? inArray(company.typeObj, typeValues) : undefined,
    scopeCondition(scope, "companies", companyColumns),
  );

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(company)
      .where(where)
      .orderBy(sql`${company.createdate} DESC`)
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(company).where(where),
  ]);

  return { data, total: Number(countResult[0].count), page, limit };
}

export async function findById(id: string, scope?: RecordAccessScope): Promise<Company | null> {
  const rows = await db
    .select()
    .from(company)
    .where(and(eq(company.id, id), eq(company.archived, false), scopeCondition(scope, "companies", companyColumns)))
    .limit(1);
  return rows[0] ?? null;
}

export async function create(input: CreateCompanyInput): Promise<Company> {
  // Every native (non-HubSpot-synced) record needs a hubspotId so it can be
  // targeted by dynamic_associations joins — same synthetic local-<uuid>
  // convention as quote.repository.ts's create(). Without this, a company
  // created here could never be associated with anything.
  const id = randomUUID();
  await db
    .insert(company)
    .values({ id, ...input, hubspotId: `local-${randomUUID()}`, archived: false });
  const rows = await db.select().from(company).where(eq(company.id, id)).limit(1);
  return rows[0];
}

export async function update(id: string, input: UpdateCompanyInput, scope?: RecordAccessScope): Promise<Company | null> {
  const where = and(eq(company.id, id), scopeCondition(scope, "companies", companyColumns));
  await db
    .update(company)
    .set({ ...input, updatedAt: new Date() })
    .where(where);
  const rows = await db.select().from(company).where(where).limit(1);
  return rows[0] ?? null;
}

// Cascades a company's lifecycle stage to every contact associated with it —
// e.g. a company moving to "Partner" carries all its contacts to "Partner"
// too. Deliberately a blunt one-way sync (no per-contact override) until a
// more nuanced rules feature replaces this; see LifecycleStagesManager's
// banner on the Contacts tab, which now points admins at Companies instead.
export async function syncContactsLifecycleStage(companyId: string, lifecyclestage: string | null): Promise<void> {
  const companyRow = await db.select({ hubspotId: company.hubspotId }).from(company).where(eq(company.id, companyId)).limit(1);
  const companyHubspotId = companyRow[0]?.hubspotId;
  if (!companyHubspotId) return;

  const associatedContactHubspotIds = db
    .select({ hubspotId: dynamicAssociation.toHubspotId })
    .from(dynamicAssociation)
    .where(
      and(
        eq(dynamicAssociation.fromObjectType, "companies"),
        eq(dynamicAssociation.fromHubspotId, companyHubspotId),
        eq(dynamicAssociation.toObjectType, "contacts"),
      ),
    );

  await db
    .update(contactLite)
    .set({ lifecyclestage, updatedAt: new Date() })
    .where(and(eq(contactLite.archived, false), inArray(contactLite.hubspotId, associatedContactHubspotIds)));
}

// Soft-archive, matching every other object's remove() in this codebase.
export async function remove(id: string, scope?: RecordAccessScope): Promise<boolean> {
  const [result] = await db
    .update(company)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(company.id, id), scopeCondition(scope, "companies", companyColumns)));
  return result.affectedRows > 0;
}

export async function findAssociatedCompanies(companyId: string): Promise<AssociatedCompany[]> {
  return db
    .selectDistinct({
      id: targetCompany.id,
      name: targetCompany.name,
      domain: targetCompany.domain,
      website: targetCompany.website,
    })
    .from(company)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "companies"),
        eq(dynamicAssociation.fromHubspotId, company.hubspotId),
        eq(dynamicAssociation.toObjectType, "companies"),
      ),
    )
    .innerJoin(targetCompany, eq(targetCompany.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(company.id, companyId), eq(targetCompany.archived, false)));
}

export async function findAssociatedContacts(companyId: string): Promise<AssociatedContact[]> {
  return db
    .selectDistinct({
      id: contactLite.id,
      firstname: contactLite.firstname,
      lastname: contactLite.lastname,
      email: contactLite.email,
      jobtitle: contactLite.jobtitle,
      company: contactLite.company,
    })
    .from(company)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "companies"),
        eq(dynamicAssociation.fromHubspotId, company.hubspotId),
        eq(dynamicAssociation.toObjectType, "contacts"),
      ),
    )
    .innerJoin(contactLite, eq(contactLite.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(company.id, companyId), eq(contactLite.archived, false)));
}

export async function findAssociatedDeals(companyId: string): Promise<AssociatedDeal[]> {
  return db
    .selectDistinct({
      id: deal.id,
      dealname: deal.dealname,
      amount: deal.amount,
      closedate: deal.closedate,
    })
    .from(company)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "companies"),
        eq(dynamicAssociation.fromHubspotId, company.hubspotId),
        eq(dynamicAssociation.toObjectType, "deals"),
      ),
    )
    .innerJoin(deal, eq(deal.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(company.id, companyId), eq(deal.archived, false)));
}

export async function findAssociatedTickets(companyId: string): Promise<AssociatedTicket[]> {
  return db
    .selectDistinct({
      id: ticketLite.id,
      subject: ticketLite.subject,
      hsPipelineStage: ticketLite.hsPipelineStage,
      hsTicketPriority: ticketLite.hsTicketPriority,
      createdAt: ticketLite.createdAt,
    })
    .from(company)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "companies"),
        eq(dynamicAssociation.fromHubspotId, company.hubspotId),
        eq(dynamicAssociation.toObjectType, "tickets"),
      ),
    )
    .innerJoin(ticketLite, eq(ticketLite.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(company.id, companyId), eq(ticketLite.archived, false)));
}

export async function findAssociatedLicenses(companyId: string): Promise<AssociatedLicense[]> {
  return db
    .selectDistinct({
      id: license.id,
      name: license.name,
      status: license.status,
      customerName: license.customerName,
      expirationDate: license.expirationDate,
    })
    .from(company)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "companies"),
        eq(dynamicAssociation.fromHubspotId, company.hubspotId),
        eq(dynamicAssociation.toObjectType, LICENSE_OBJECT_TYPE),
      ),
    )
    .innerJoin(license, eq(license.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(company.id, companyId), eq(license.archived, false)));
}

export async function findAssociatedInvoices(companyId: string): Promise<AssociatedInvoice[]> {
  return db
    .selectDistinct({
      id: invoice.id,
      hsNumber: invoice.hsNumber,
      hsInvoiceStatus: invoice.hsInvoiceStatus,
      hsBalanceDue: invoice.hsBalanceDue,
      hsCurrency: invoice.hsCurrency,
      hsDueDate: invoice.hsDueDate,
    })
    .from(company)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "companies"),
        eq(dynamicAssociation.fromHubspotId, company.hubspotId),
        eq(dynamicAssociation.toObjectType, "invoices"),
      ),
    )
    .innerJoin(invoice, eq(invoice.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(company.id, companyId), eq(invoice.archived, false)));
}

import { randomUUID } from "crypto";
import { and, count, eq, or, sql } from "drizzle-orm";
import { ilike } from "../../lib/sqlHelpers";
import { db } from "../../db/client";
import { contactLite as contact, ticketLite } from "../../db/lightTables";
import { company, deal, dynamicAssociation, partnership } from "../../db/schema";
import { companyAssociationExists, resolveCompanyHubspotId, scopeCondition, type RecordAccessScope } from "../../lib/scopeFilter";
import type { Contact, CreateContactDTO, PaginatedResult, UpdateContactDTO } from "./contact.types";

const PARTNERSHIP_OBJECT_TYPE = "2-10925772";
const contactColumns = { hubspotId: contact.hubspotId, hubspotOwnerId: contact.hubspotOwnerId };

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

export type AssociatedPartnership = {
  id: string;
  name: string | null;
  typeObj: string | null;
  mspLevel: string | null;
};

export type AssociatedTicket = {
  id: string;
  subject: string | null;
  hsPipelineStage: string | null;
  hsTicketPriority: string | null;
  createdAt: Date;
};

export async function findAll(
  page: number,
  limit: number,
  search?: string,
  scope?: RecordAccessScope,
  companyId?: string,
): Promise<PaginatedResult<Contact>> {
  const companyHubspotId = companyId ? await resolveCompanyHubspotId(companyId) : null;
  const where = and(
    eq(contact.archived, false),
    search
      ? or(
          ilike(contact.firstname, `%${search}%`),
          ilike(contact.lastname, `%${search}%`),
          ilike(contact.email, `%${search}%`),
          // Matches a typed full name (e.g. "Jorge Infante") against
          // firstname+lastname together — neither column alone contains that
          // whole string, so without this a full-name search returns nothing.
          sql`LOWER(concat_ws(' ', ${contact.firstname}, ${contact.lastname})) LIKE LOWER(${`%${search}%`})`,
        )
      : undefined,
    companyId ? (companyHubspotId ? companyAssociationExists("contacts", contact.hubspotId, companyHubspotId) : sql`false`) : undefined,
    scopeCondition(scope, "contacts", contactColumns),
  );

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(contact)
      .where(where)
      .orderBy(sql`${contact.createdate} DESC`)
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(contact).where(where),
  ]);

  return { data, total: Number(countResult[0].count), page, limit };
}

export async function findById(id: string, scope?: RecordAccessScope): Promise<Contact | null> {
  const rows = await db
    .select()
    .from(contact)
    .where(and(eq(contact.id, id), eq(contact.archived, false), scopeCondition(scope, "contacts", contactColumns)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findByEmail(email: string): Promise<Contact | null> {
  const rows = await db
    .select()
    .from(contact)
    .where(and(eq(contact.email, email), eq(contact.archived, false)))
    .limit(1);
  return rows[0] ?? null;
}

export async function create(data: CreateContactDTO): Promise<Contact> {
  // Every native (non-HubSpot-synced) record needs a hubspotId so it can be
  // targeted by dynamic_associations joins — same synthetic local-<uuid>
  // convention as quote.repository.ts's create(). Without this, a contact
  // created here could never be associated with anything.
  const id = randomUUID();
  await db
    .insert(contact)
    .values({
      id,
      hubspotId: `local-${randomUUID()}`,
      firstname: data.firstname,
      lastname: data.lastname ?? null,
      email: data.email,
      phone: data.phone ?? null,
      mobilephone: data.mobilephone ?? null,
      company: data.company ?? null,
      jobtitle: data.jobtitle ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      country: data.country ?? null,
      archived: false,
    });

  const rows = await db.select().from(contact).where(eq(contact.id, id)).limit(1);
  return rows[0];
}

export async function update(id: string, data: UpdateContactDTO, scope?: RecordAccessScope): Promise<Contact | null> {
  const where = and(eq(contact.id, id), eq(contact.archived, false), scopeCondition(scope, "contacts", contactColumns));
  await db
    .update(contact)
    .set({ ...data, updatedAt: new Date() })
    .where(where);

  const rows = await db.select().from(contact).where(where).limit(1);
  return rows[0] ?? null;
}

export async function remove(id: string, scope?: RecordAccessScope): Promise<boolean> {
  const [result] = await db
    .update(contact)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(contact.id, id), scopeCondition(scope, "contacts", contactColumns)));
  return result.affectedRows > 0;
}

export async function findAssociatedCompanies(contactId: string): Promise<AssociatedCompany[]> {
  return db
    .selectDistinct({
      id: company.id,
      name: company.name,
      domain: company.domain,
      website: company.website,
    })
    .from(contact)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "contacts"),
        eq(dynamicAssociation.fromHubspotId, contact.hubspotId),
        eq(dynamicAssociation.toObjectType, "companies"),
      ),
    )
    .innerJoin(company, eq(company.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(contact.id, contactId), eq(company.archived, false)));
}

export async function findAssociatedDeals(contactId: string): Promise<AssociatedDeal[]> {
  return db
    .selectDistinct({
      id: deal.id,
      dealname: deal.dealname,
      amount: deal.amount,
      closedate: deal.closedate,
    })
    .from(contact)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "contacts"),
        eq(dynamicAssociation.fromHubspotId, contact.hubspotId),
        eq(dynamicAssociation.toObjectType, "deals"),
      ),
    )
    .innerJoin(deal, eq(deal.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(contact.id, contactId), eq(deal.archived, false)));
}

export async function findAssociatedPartnerships(contactId: string): Promise<AssociatedPartnership[]> {
  return db
    .selectDistinct({
      id: partnership.id,
      name: partnership.name,
      typeObj: partnership.typeObj,
      mspLevel: partnership.mspLevel,
    })
    .from(contact)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "contacts"),
        eq(dynamicAssociation.fromHubspotId, contact.hubspotId),
        eq(dynamicAssociation.toObjectType, PARTNERSHIP_OBJECT_TYPE),
      ),
    )
    .innerJoin(partnership, eq(partnership.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(contact.id, contactId), eq(partnership.archived, false)));
}

export async function findAssociatedTickets(contactId: string): Promise<AssociatedTicket[]> {
  return db
    .selectDistinct({
      id: ticketLite.id,
      subject: ticketLite.subject,
      hsPipelineStage: ticketLite.hsPipelineStage,
      hsTicketPriority: ticketLite.hsTicketPriority,
      createdAt: ticketLite.createdAt,
    })
    .from(contact)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "contacts"),
        eq(dynamicAssociation.fromHubspotId, contact.hubspotId),
        eq(dynamicAssociation.toObjectType, "tickets"),
      ),
    )
    .innerJoin(ticketLite, eq(ticketLite.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(contact.id, contactId), eq(ticketLite.archived, false)));
}

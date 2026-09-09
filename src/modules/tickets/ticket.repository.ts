import { randomUUID } from 'crypto';
import { and, count, desc, eq } from 'drizzle-orm';
import { ilike } from '../../lib/sqlHelpers';
import { db } from '../../db/client';
import { contactLite, ticketLite as ticket } from '../../db/lightTables';
import { company, deal, dynamicAssociation } from '../../db/schema';
import { scopeCondition, type RecordAccessScope } from '../../lib/scopeFilter';
import type {
  AssociatedContact,
  AssociatedCompany,
  AssociatedDeal,
  BoardTicket,
  CreateTicketInput,
  PaginatedResult,
  Ticket,
  UpdateTicketInput,
} from './ticket.types';

const ticketColumns = {
  hubspotId: ticket.hubspotId,
  hubspotOwnerId: ticket.hubspotOwnerId,
  createdByUserId: ticket.createdByUserId,
};

export async function findAll(page: number, limit: number, search?: string, pipeline?: string, scope?: RecordAccessScope): Promise<PaginatedResult<Ticket>> {
  const where = and(
    eq(ticket.archived, false),
    search ? ilike(ticket.subject, `%${search}%`) : undefined,
    pipeline ? eq(ticket.hsPipeline, pipeline) : undefined,
    scopeCondition(scope, 'tickets', ticketColumns),
  );

  const [data, countResult] = await Promise.all([
    db.select().from(ticket).where(where).orderBy(desc(ticket.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ count: count() }).from(ticket).where(where),
  ]);

  return { data, total: Number(countResult[0].count), page, limit };
}

export async function findById(id: string, scope?: RecordAccessScope): Promise<Ticket | null> {
  const rows = await db
    .select()
    .from(ticket)
    .where(and(eq(ticket.id, id), eq(ticket.archived, false), scopeCondition(scope, 'tickets', ticketColumns)))
    .limit(1);
  return rows[0] ?? null;
}

export async function create(input: CreateTicketInput, createdByUserId?: string): Promise<Ticket> {
  const id = randomUUID();
  const hubspotId = createdByUserId ? `local-${randomUUID()}` : undefined;
  await db
    .insert(ticket)
    .values({ id, ...input, archived: false, hubspotId, createdByUserId });
  const rows = await db.select().from(ticket).where(eq(ticket.id, id)).limit(1);
  return rows[0];
}

// Mirrors deal.repository.ts's associateWithCompany — same dynamic_associations
// table, no bespoke join table.
export async function associateWithCompany(ticketHubspotId: string, companyHubspotId: string): Promise<void> {
  await db.insert(dynamicAssociation).values({
    fromObjectType: 'tickets',
    fromHubspotId: ticketHubspotId,
    toObjectType: 'companies',
    toHubspotId: companyHubspotId,
    associationLabel: 'primary',
  });
}

export async function findAllForBoard(search?: string, scope?: RecordAccessScope): Promise<BoardTicket[]> {
  const where = and(
    eq(ticket.archived, false),
    search ? ilike(ticket.subject, `%${search}%`) : undefined,
    scopeCondition(scope, 'tickets', ticketColumns),
  );
  return db
    .select({
      id: ticket.id,
      subject: ticket.subject,
      hsPipeline: ticket.hsPipeline,
      hsPipelineStage: ticket.hsPipelineStage,
      hsTicketPriority: ticket.hsTicketPriority,
    })
    .from(ticket)
    .where(where)
    .orderBy(desc(ticket.createdAt));
}

export async function updateStage(id: string, stage: string, scope?: RecordAccessScope): Promise<Ticket | null> {
  const where = and(eq(ticket.id, id), eq(ticket.archived, false), scopeCondition(scope, 'tickets', ticketColumns));
  await db
    .update(ticket)
    .set({ hsPipelineStage: stage, updatedAt: new Date() })
    .where(where);
  const rows = await db.select().from(ticket).where(where).limit(1);
  return rows[0] ?? null;
}

export async function update(id: string, input: UpdateTicketInput, scope?: RecordAccessScope): Promise<Ticket | null> {
  const where = and(eq(ticket.id, id), eq(ticket.archived, false), scopeCondition(scope, 'tickets', ticketColumns));
  await db
    .update(ticket)
    .set({ ...input, updatedAt: new Date() })
    .where(where);
  const rows = await db.select().from(ticket).where(where).limit(1);
  return rows[0] ?? null;
}

// Soft-archive, matching every other object's remove() in this codebase.
export async function remove(id: string, scope?: RecordAccessScope): Promise<boolean> {
  const [result] = await db
    .update(ticket)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(ticket.id, id), scopeCondition(scope, 'tickets', ticketColumns)));
  return result.affectedRows > 0;
}

export async function findAssociatedContacts(ticketId: string): Promise<AssociatedContact[]> {
  return db
    .selectDistinct({
      id: contactLite.id,
      firstname: contactLite.firstname,
      lastname: contactLite.lastname,
      email: contactLite.email,
      jobtitle: contactLite.jobtitle,
      company: contactLite.company,
    })
    .from(ticket)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, 'tickets'),
        eq(dynamicAssociation.fromHubspotId, ticket.hubspotId),
        eq(dynamicAssociation.toObjectType, 'contacts'),
      ),
    )
    .innerJoin(contactLite, eq(contactLite.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(ticket.id, ticketId), eq(contactLite.archived, false)));
}

export async function findAssociatedCompanies(ticketId: string): Promise<AssociatedCompany[]> {
  return db
    .selectDistinct({
      id: company.id,
      name: company.name,
      domain: company.domain,
      website: company.website,
    })
    .from(ticket)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, 'tickets'),
        eq(dynamicAssociation.fromHubspotId, ticket.hubspotId),
        eq(dynamicAssociation.toObjectType, 'companies'),
      ),
    )
    .innerJoin(company, eq(company.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(ticket.id, ticketId), eq(company.archived, false)));
}

export async function findAssociatedDeals(ticketId: string): Promise<AssociatedDeal[]> {
  return db
    .selectDistinct({
      id: deal.id,
      dealname: deal.dealname,
      amount: deal.amount,
      closedate: deal.closedate,
    })
    .from(ticket)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, 'tickets'),
        eq(dynamicAssociation.fromHubspotId, ticket.hubspotId),
        eq(dynamicAssociation.toObjectType, 'deals'),
      ),
    )
    .innerJoin(deal, eq(deal.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(ticket.id, ticketId), eq(deal.archived, false)));
}

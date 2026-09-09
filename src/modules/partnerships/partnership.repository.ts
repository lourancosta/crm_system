import { randomUUID } from "crypto";
import { and, count, eq, sql } from "drizzle-orm";
import { ilike } from "../../lib/sqlHelpers";
import { db } from "../../db/client";
import { contactLite as contact } from "../../db/lightTables";
import { company, partnership, dynamicAssociation } from "../../db/schema";
import { scopeCondition, type RecordAccessScope } from "../../lib/scopeFilter";
import type {
  BoardPartnership,
  CreatePartnershipInput,
  Partnership,
  PaginatedResult,
  UpdatePartnershipInput,
} from "./partnership.types";

// Partnerships are a HubSpot custom object — associations key off this raw
// type ID (portal-specific), same constant already hardcoded the other way
// around in contact.repository.ts (contact -> partnerships).
const PARTNERSHIP_OBJECT_TYPE = "2-10925772";

const partnershipColumns = { hubspotId: partnership.hubspotId, hubspotOwnerId: partnership.hubspotOwnerId };

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

export async function findAll(page: number, limit: number, search?: string, pipeline?: string, scope?: RecordAccessScope): Promise<PaginatedResult<Partnership>> {
  const where = and(
    eq(partnership.archived, false),
    search ? ilike(partnership.name, `%${search}%`) : undefined,
    pipeline ? eq(partnership.hsPipeline, pipeline) : undefined,
    scopeCondition(scope, "partnerships", partnershipColumns),
  );

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(partnership)
      .where(where)
      .orderBy(sql`${partnership.hsCreatedate} DESC`)
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(partnership).where(where),
  ]);

  return { data, total: Number(countResult[0].count), page, limit };
}

export async function findById(id: string, scope?: RecordAccessScope): Promise<Partnership | null> {
  const rows = await db
    .select()
    .from(partnership)
    .where(and(eq(partnership.id, id), eq(partnership.archived, false), scopeCondition(scope, "partnerships", partnershipColumns)))
    .limit(1);
  return rows[0] ?? null;
}

export async function create(input: CreatePartnershipInput): Promise<Partnership> {
  const id = randomUUID();
  await db
    .insert(partnership)
    .values({ id, ...input, archived: false });
  const rows = await db.select().from(partnership).where(eq(partnership.id, id)).limit(1);
  return rows[0];
}

export async function updateStage(id: string, stage: string, scope?: RecordAccessScope): Promise<Partnership | null> {
  const where = and(eq(partnership.id, id), eq(partnership.archived, false), scopeCondition(scope, "partnerships", partnershipColumns));
  await db
    .update(partnership)
    .set({ hsPipelineStage: stage, updatedAt: new Date() })
    .where(where);
  const rows = await db.select().from(partnership).where(where).limit(1);
  return rows[0] ?? null;
}

export async function update(id: string, input: UpdatePartnershipInput, scope?: RecordAccessScope): Promise<Partnership | null> {
  const where = and(eq(partnership.id, id), eq(partnership.archived, false), scopeCondition(scope, "partnerships", partnershipColumns));
  await db
    .update(partnership)
    .set({ ...input, updatedAt: new Date() })
    .where(where);
  const rows = await db.select().from(partnership).where(where).limit(1);
  return rows[0] ?? null;
}

// Soft-archive, matching every other object's remove() in this codebase.
export async function remove(id: string, scope?: RecordAccessScope): Promise<boolean> {
  const [result] = await db
    .update(partnership)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(partnership.id, id), scopeCondition(scope, "partnerships", partnershipColumns)));
  return result.affectedRows > 0;
}

export async function findAllForBoard(search?: string, scope?: RecordAccessScope): Promise<BoardPartnership[]> {
  const where = and(
    eq(partnership.archived, false),
    search ? ilike(partnership.name, `%${search}%`) : undefined,
    scopeCondition(scope, "partnerships", partnershipColumns),
  );
  return db
    .select({
      id: partnership.id,
      name: partnership.name,
      hsPipeline: partnership.hsPipeline,
      hsPipelineStage: partnership.hsPipelineStage,
      mspLevel: partnership.mspLevel,
      closeDate: partnership.closeDate,
    })
    .from(partnership)
    .where(where)
    .orderBy(sql`${partnership.hsCreatedate} DESC`);
}

export async function findAssociatedCompanies(partnershipId: string): Promise<AssociatedCompany[]> {
  return db
    .selectDistinct({
      id: company.id,
      name: company.name,
      domain: company.domain,
      website: company.website,
    })
    .from(partnership)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, PARTNERSHIP_OBJECT_TYPE),
        eq(dynamicAssociation.fromHubspotId, partnership.hubspotId),
        eq(dynamicAssociation.toObjectType, "companies"),
      ),
    )
    .innerJoin(company, eq(company.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(partnership.id, partnershipId), eq(company.archived, false)));
}

export async function findAssociatedContacts(partnershipId: string): Promise<AssociatedContact[]> {
  return db
    .selectDistinct({
      id: contact.id,
      firstname: contact.firstname,
      lastname: contact.lastname,
      email: contact.email,
      jobtitle: contact.jobtitle,
      company: contact.company,
    })
    .from(partnership)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, PARTNERSHIP_OBJECT_TYPE),
        eq(dynamicAssociation.fromHubspotId, partnership.hubspotId),
        eq(dynamicAssociation.toObjectType, "contacts"),
      ),
    )
    .innerJoin(contact, eq(contact.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(partnership.id, partnershipId), eq(contact.archived, false)));
}

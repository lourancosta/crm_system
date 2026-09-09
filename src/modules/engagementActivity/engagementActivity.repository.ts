import { randomUUID } from "crypto";
import { and, asc, eq, gt, or, type Column } from "drizzle-orm";
import { db } from "../../db/client";
import { company, deal, dynamicAssociation, engagementActivitySyncState, processedHubspotEngagement } from "../../db/schema";
import { callLite, contactLite as contact, meetingLite, noteLite, ticketLite } from "../../db/lightTables";
import * as historyRepo from "../history/history.repository";
import type { HistoryLoggableObjectType } from "../history/history.types";

export type EngagementType = "note" | "call" | "meeting";

// (hs_lastmodifieddate, id) compound cursor — id (the row's own uuid primary
// key, always unique) is a tie-breaker for hs_lastmodifieddate. Needed
// because some datasets (e.g. a bulk-seeded local DB) have far more than one
// page's worth of rows sharing the exact same hs_lastmodifieddate, which a
// timestamp-only watermark can never page past — a full page of tied rows
// never reaches a later timestamp, so it stalls forever. Ordering by
// (hsLastmodifieddate, id) and cursoring on both guarantees every page makes
// strict forward progress regardless of how large a tie is.
export type EngagementCursor = { modifiedAt: Date; id: string };

function cursorCondition(modifiedAtColumn: Column, idColumn: Column, cursor: EngagementCursor | null) {
  if (!cursor) return undefined;
  return or(gt(modifiedAtColumn, cursor.modifiedAt), and(eq(modifiedAtColumn, cursor.modifiedAt), gt(idColumn, cursor.id)));
}

// The plural HubSpot object-type strings used as dynamic_associations.from_object_type
// for each engagement — distinct from EngagementType (singular, matches
// record_history.type / ACTIVITY_TITLES) since they're used in different places.
const SOURCE_OBJECT_TYPE: Record<EngagementType, string> = {
  note: "notes",
  call: "calls",
  meeting: "meetings",
};

export type NoteRecord = typeof noteLite.$inferSelect;
export type CallRecord = typeof callLite.$inferSelect;
export type MeetingRecord = typeof meetingLite.$inferSelect;

export type EngagementActivityTarget = {
  objectType: Extract<HistoryLoggableObjectType, "contacts" | "companies" | "deals" | "tickets">;
  objectId: string;
};

export function findCandidateNotes(cursor: EngagementCursor | null, limit: number): Promise<NoteRecord[]> {
  return db
    .select()
    .from(noteLite)
    .where(cursorCondition(noteLite.hsLastmodifieddate, noteLite.id, cursor))
    .orderBy(asc(noteLite.hsLastmodifieddate), asc(noteLite.id))
    .limit(limit);
}

export function findCandidateCalls(cursor: EngagementCursor | null, limit: number): Promise<CallRecord[]> {
  return db
    .select()
    .from(callLite)
    .where(cursorCondition(callLite.hsLastmodifieddate, callLite.id, cursor))
    .orderBy(asc(callLite.hsLastmodifieddate), asc(callLite.id))
    .limit(limit);
}

export function findCandidateMeetings(cursor: EngagementCursor | null, limit: number): Promise<MeetingRecord[]> {
  return db
    .select()
    .from(meetingLite)
    .where(cursorCondition(meetingLite.hsLastmodifieddate, meetingLite.id, cursor))
    .orderBy(asc(meetingLite.hsLastmodifieddate), asc(meetingLite.id))
    .limit(limit);
}

// Mirrors emailActivity.repository.ts's findAssociated{Contacts,Companies,Deals,Tickets}
// exactly, just parameterized by the source engagement's plural object-type
// string instead of being hardcoded to "emails". selectDistinct matters here
// for the same reason as email: HubSpot can return more than one association
// row for the same source->target pair.
async function findAssociatedContacts(fromObjectType: string, hubspotId: string) {
  return db
    .selectDistinct({ id: contact.id })
    .from(dynamicAssociation)
    .innerJoin(contact, eq(contact.hubspotId, dynamicAssociation.toHubspotId))
    .where(
      and(
        eq(dynamicAssociation.fromObjectType, fromObjectType),
        eq(dynamicAssociation.fromHubspotId, hubspotId),
        eq(dynamicAssociation.toObjectType, "contacts"),
        eq(contact.archived, false),
      ),
    );
}

async function findAssociatedCompanies(fromObjectType: string, hubspotId: string) {
  return db
    .selectDistinct({ id: company.id })
    .from(dynamicAssociation)
    .innerJoin(company, eq(company.hubspotId, dynamicAssociation.toHubspotId))
    .where(
      and(
        eq(dynamicAssociation.fromObjectType, fromObjectType),
        eq(dynamicAssociation.fromHubspotId, hubspotId),
        eq(dynamicAssociation.toObjectType, "companies"),
        eq(company.archived, false),
      ),
    );
}

async function findAssociatedDeals(fromObjectType: string, hubspotId: string) {
  return db
    .selectDistinct({ id: deal.id })
    .from(dynamicAssociation)
    .innerJoin(deal, eq(deal.hubspotId, dynamicAssociation.toHubspotId))
    .where(
      and(
        eq(dynamicAssociation.fromObjectType, fromObjectType),
        eq(dynamicAssociation.fromHubspotId, hubspotId),
        eq(dynamicAssociation.toObjectType, "deals"),
        eq(deal.archived, false),
      ),
    );
}

async function findAssociatedTickets(fromObjectType: string, hubspotId: string) {
  return db
    .selectDistinct({ id: ticketLite.id })
    .from(dynamicAssociation)
    .innerJoin(ticketLite, eq(ticketLite.hubspotId, dynamicAssociation.toHubspotId))
    .where(
      and(
        eq(dynamicAssociation.fromObjectType, fromObjectType),
        eq(dynamicAssociation.fromHubspotId, hubspotId),
        eq(dynamicAssociation.toObjectType, "tickets"),
        eq(ticketLite.archived, false),
      ),
    );
}

export async function findAssociatedTargets(
  engagementType: EngagementType,
  hubspotId: string,
): Promise<EngagementActivityTarget[]> {
  const fromObjectType = SOURCE_OBJECT_TYPE[engagementType];
  const [contacts, companies, deals, tickets] = await Promise.all([
    findAssociatedContacts(fromObjectType, hubspotId),
    findAssociatedCompanies(fromObjectType, hubspotId),
    findAssociatedDeals(fromObjectType, hubspotId),
    findAssociatedTickets(fromObjectType, hubspotId),
  ]);

  return [
    ...contacts.map((c) => ({ objectType: "contacts" as const, objectId: c.id })),
    ...companies.map((c) => ({ objectType: "companies" as const, objectId: c.id })),
    ...deals.map((d) => ({ objectType: "deals" as const, objectId: d.id })),
    ...tickets.map((t) => ({ objectType: "tickets" as const, objectId: t.id })),
  ];
}

export async function hasProcessed(engagementType: EngagementType, hubspotId: string): Promise<boolean> {
  const rows = await db
    .select({ id: processedHubspotEngagement.id })
    .from(processedHubspotEngagement)
    .where(
      and(
        eq(processedHubspotEngagement.engagementType, engagementType),
        eq(processedHubspotEngagement.engagementHubspotId, hubspotId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// Fans a single engagement out into one record_history row per associated
// target, plus the dedup marker, all in one transaction — same shape as
// emailActivity.repository.ts::markProcessedAndLog, so a failure partway
// through never leaves orphaned timeline entries without their dedup row.
export async function markProcessedAndLog(
  engagementType: EngagementType,
  hubspotId: string,
  targets: EngagementActivityTarget[],
  content: { title: string; description: string; occurredAt: Date },
): Promise<void> {
  const activityGroupId = randomUUID();

  await db.transaction(async (tx) => {
    for (const target of targets) {
      await historyRepo.create(
        {
          objectType: target.objectType,
          objectId: target.objectId,
          type: engagementType,
          title: content.title,
          description: content.description,
          occurredAt: content.occurredAt,
          activityGroupId,
        },
        tx,
      );
    }

    await tx
      .insert(processedHubspotEngagement)
      .ignore()
      .values({ engagementType, engagementHubspotId: hubspotId, activityGroupId });
  });
}

export async function getWatermark(engagementType: EngagementType): Promise<EngagementCursor | null> {
  const rows = await db
    .select()
    .from(engagementActivitySyncState)
    .where(eq(engagementActivitySyncState.engagementType, engagementType))
    .limit(1);
  const row = rows[0];
  if (!row?.lastProcessedModifiedAt || !row.lastProcessedId) return null;
  return { modifiedAt: row.lastProcessedModifiedAt, id: row.lastProcessedId };
}

export async function setWatermark(engagementType: EngagementType, cursor: EngagementCursor): Promise<void> {
  const rows = await db
    .select({ id: engagementActivitySyncState.id })
    .from(engagementActivitySyncState)
    .where(eq(engagementActivitySyncState.engagementType, engagementType))
    .limit(1);

  if (rows[0]) {
    await db
      .update(engagementActivitySyncState)
      .set({ lastProcessedModifiedAt: cursor.modifiedAt, lastProcessedId: cursor.id, updatedAt: new Date() })
      .where(eq(engagementActivitySyncState.id, rows[0].id));
  } else {
    await db
      .insert(engagementActivitySyncState)
      .values({ engagementType, lastProcessedModifiedAt: cursor.modifiedAt, lastProcessedId: cursor.id });
  }
}

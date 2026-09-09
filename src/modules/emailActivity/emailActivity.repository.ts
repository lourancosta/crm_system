import { randomUUID } from "crypto";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "../../db/client";
import { company, deal, dynamicAssociation, emailActivitySyncState, processedHubspotEmail } from "../../db/schema";
import { contactLite as contact, emailLite, ticketLite } from "../../db/lightTables";
import * as historyRepo from "../history/history.repository";
import type { HistoryLoggableObjectType } from "../history/history.types";

export type EmailRecord = typeof emailLite.$inferSelect;

export type EmailActivityTarget = {
  objectType: Extract<HistoryLoggableObjectType, "contacts" | "companies" | "deals" | "tickets">;
  objectId: string;
};

// Uses >= rather than > against the watermark: several emails can share the
// exact same hs_lastmodifieddate, and a page boundary landing mid-tie with a
// strict `>` would permanently skip the remaining tied rows once the
// watermark advances past them. `>=` re-scans a few already-processed rows
// at each page boundary instead, which is safe and cheap because
// processNewEmails skips anything hasProcessed() already covers.
export async function findCandidateEmails(since: Date | null, limit: number): Promise<EmailRecord[]> {
  return db
    .select()
    .from(emailLite)
    .where(since ? gte(emailLite.hsLastmodifieddate, since) : undefined)
    .orderBy(asc(emailLite.hsLastmodifieddate))
    .limit(limit);
}

// Mirrors invoice.repository.ts's findAssociatedCompanies/findAssociatedContacts
// pattern (one query per target object type), but starting FROM the email
// side of dynamic_associations instead of an invoice.
// selectDistinct matters here: HubSpot can return more than one association
// row for the same email->target pair (e.g. one keyed by the raw numeric
// association type ID, another by its human-readable label) — without it,
// the same target would get logged twice for one email.
async function findAssociatedContacts(emailHubspotId: string) {
  return db
    .selectDistinct({ id: contact.id })
    .from(dynamicAssociation)
    .innerJoin(contact, eq(contact.hubspotId, dynamicAssociation.toHubspotId))
    .where(
      and(
        eq(dynamicAssociation.fromObjectType, "emails"),
        eq(dynamicAssociation.fromHubspotId, emailHubspotId),
        eq(dynamicAssociation.toObjectType, "contacts"),
        eq(contact.archived, false),
      ),
    );
}

async function findAssociatedCompanies(emailHubspotId: string) {
  return db
    .selectDistinct({ id: company.id })
    .from(dynamicAssociation)
    .innerJoin(company, eq(company.hubspotId, dynamicAssociation.toHubspotId))
    .where(
      and(
        eq(dynamicAssociation.fromObjectType, "emails"),
        eq(dynamicAssociation.fromHubspotId, emailHubspotId),
        eq(dynamicAssociation.toObjectType, "companies"),
        eq(company.archived, false),
      ),
    );
}

async function findAssociatedDeals(emailHubspotId: string) {
  return db
    .selectDistinct({ id: deal.id })
    .from(dynamicAssociation)
    .innerJoin(deal, eq(deal.hubspotId, dynamicAssociation.toHubspotId))
    .where(
      and(
        eq(dynamicAssociation.fromObjectType, "emails"),
        eq(dynamicAssociation.fromHubspotId, emailHubspotId),
        eq(dynamicAssociation.toObjectType, "deals"),
        eq(deal.archived, false),
      ),
    );
}

async function findAssociatedTickets(emailHubspotId: string) {
  return db
    .selectDistinct({ id: ticketLite.id })
    .from(dynamicAssociation)
    .innerJoin(ticketLite, eq(ticketLite.hubspotId, dynamicAssociation.toHubspotId))
    .where(
      and(
        eq(dynamicAssociation.fromObjectType, "emails"),
        eq(dynamicAssociation.fromHubspotId, emailHubspotId),
        eq(dynamicAssociation.toObjectType, "tickets"),
        eq(ticketLite.archived, false),
      ),
    );
}

export async function findAssociatedTargets(emailHubspotId: string): Promise<EmailActivityTarget[]> {
  const [contacts, companies, deals, tickets] = await Promise.all([
    findAssociatedContacts(emailHubspotId),
    findAssociatedCompanies(emailHubspotId),
    findAssociatedDeals(emailHubspotId),
    findAssociatedTickets(emailHubspotId),
  ]);

  return [
    ...contacts.map((c) => ({ objectType: "contacts" as const, objectId: c.id })),
    ...companies.map((c) => ({ objectType: "companies" as const, objectId: c.id })),
    ...deals.map((d) => ({ objectType: "deals" as const, objectId: d.id })),
    ...tickets.map((t) => ({ objectType: "tickets" as const, objectId: t.id })),
  ];
}

export async function hasProcessed(emailHubspotId: string): Promise<boolean> {
  const rows = await db
    .select({ id: processedHubspotEmail.id })
    .from(processedHubspotEmail)
    .where(eq(processedHubspotEmail.emailHubspotId, emailHubspotId))
    .limit(1);
  return rows.length > 0;
}

// Fans a single email out into one record_history row per associated target,
// plus the dedup marker, all in one transaction — so a failure partway
// through never leaves orphaned timeline entries without their dedup row (or
// vice versa), and a retry after a crash is always safe to re-run.
export async function markProcessedAndLog(
  emailHubspotId: string,
  targets: EmailActivityTarget[],
  content: { title: string; description: string; occurredAt: Date },
): Promise<void> {
  const activityGroupId = randomUUID();

  await db.transaction(async (tx) => {
    for (const target of targets) {
      await historyRepo.create(
        {
          objectType: target.objectType,
          objectId: target.objectId,
          type: "email",
          title: content.title,
          description: content.description,
          occurredAt: content.occurredAt,
          activityGroupId,
        },
        tx,
      );
    }

    await tx.insert(processedHubspotEmail).ignore().values({ emailHubspotId, activityGroupId });
  });
}

export async function getWatermark(): Promise<Date | null> {
  const rows = await db.select().from(emailActivitySyncState).limit(1);
  return rows[0]?.lastProcessedModifiedAt ?? null;
}

export async function setWatermark(date: Date): Promise<void> {
  const rows = await db.select({ id: emailActivitySyncState.id }).from(emailActivitySyncState).limit(1);

  if (rows[0]) {
    await db
      .update(emailActivitySyncState)
      .set({ lastProcessedModifiedAt: date, updatedAt: new Date() })
      .where(eq(emailActivitySyncState.id, rows[0].id));
  } else {
    await db.insert(emailActivitySyncState).values({ lastProcessedModifiedAt: date });
  }
}

import { and, eq, or } from "drizzle-orm";
import { db } from "../../db/client";
import { contactLite, ticketLite } from "../../db/lightTables";
import { company, deal, dynamicAssociation, invoice, license, partnership } from "../../db/schema";
import { OBJECT_TYPES, type AssociableType } from "../../lib/objectTypes";

// One case per AssociableType rather than a generic table lookup — the
// tables don't share a common typed shape Drizzle can query generically
// without `any`, and there are only 7 of them (mirrors the rest of this
// codebase's preference for explicit per-entity blocks over cross-entity
// generics, e.g. quote.repository.ts's associateCompany/associateDeal/etc).
export async function resolveHubspotId(type: AssociableType, id: string): Promise<string | null> {
  switch (type) {
    case "contacts": {
      const rows = await db
        .select({ hubspotId: contactLite.hubspotId })
        .from(contactLite)
        .where(and(eq(contactLite.id, id), eq(contactLite.archived, false)))
        .limit(1);
      return rows[0]?.hubspotId ?? null;
    }
    case "companies": {
      const rows = await db
        .select({ hubspotId: company.hubspotId })
        .from(company)
        .where(and(eq(company.id, id), eq(company.archived, false)))
        .limit(1);
      return rows[0]?.hubspotId ?? null;
    }
    case "deals": {
      const rows = await db
        .select({ hubspotId: deal.hubspotId })
        .from(deal)
        .where(and(eq(deal.id, id), eq(deal.archived, false)))
        .limit(1);
      return rows[0]?.hubspotId ?? null;
    }
    case "tickets": {
      const rows = await db
        .select({ hubspotId: ticketLite.hubspotId })
        .from(ticketLite)
        .where(and(eq(ticketLite.id, id), eq(ticketLite.archived, false)))
        .limit(1);
      return rows[0]?.hubspotId ?? null;
    }
    case "partnerships": {
      const rows = await db
        .select({ hubspotId: partnership.hubspotId })
        .from(partnership)
        .where(and(eq(partnership.id, id), eq(partnership.archived, false)))
        .limit(1);
      return rows[0]?.hubspotId ?? null;
    }
    case "licenses": {
      const rows = await db
        .select({ hubspotId: license.hubspotId })
        .from(license)
        .where(and(eq(license.id, id), eq(license.archived, false)))
        .limit(1);
      return rows[0]?.hubspotId ?? null;
    }
    case "invoices": {
      const rows = await db
        .select({ hubspotId: invoice.hubspotId })
        .from(invoice)
        .where(and(eq(invoice.id, id), eq(invoice.archived, false)))
        .limit(1);
      return rows[0]?.hubspotId ?? null;
    }
  }
}

export async function associationExists(
  fromType: AssociableType,
  fromHubspotId: string,
  toType: AssociableType,
  toHubspotId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: dynamicAssociation.id })
    .from(dynamicAssociation)
    .where(
      and(
        eq(dynamicAssociation.fromObjectType, OBJECT_TYPES[fromType].associationType),
        eq(dynamicAssociation.fromHubspotId, fromHubspotId),
        eq(dynamicAssociation.toObjectType, OBJECT_TYPES[toType].associationType),
        eq(dynamicAssociation.toHubspotId, toHubspotId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// Bidirectional insert (A->B and B->A), same convention as
// quote.repository.ts's associateCompany/associateDeal/associateContact.
export async function createAssociation(
  fromType: AssociableType,
  fromHubspotId: string,
  toType: AssociableType,
  toHubspotId: string,
): Promise<void> {
  const fromAssocType = OBJECT_TYPES[fromType].associationType;
  const toAssocType = OBJECT_TYPES[toType].associationType;

  await db.insert(dynamicAssociation).values([
    {
      fromObjectType: fromAssocType,
      fromHubspotId,
      toObjectType: toAssocType,
      toHubspotId,
      associationLabel: `${fromType}_to_${toType}`,
    },
    {
      fromObjectType: toAssocType,
      fromHubspotId: toHubspotId,
      toObjectType: fromAssocType,
      toHubspotId: fromHubspotId,
      associationLabel: `${toType}_to_${fromType}`,
    },
  ]);
}

// Bidirectional delete, scoped to this specific pair of hubspotIds only —
// unlike quote.repository.ts's replaceDealAssociation (which deletes every
// row of a type since a quote has at most one deal), a contact can have many
// companies, so only the exact pair being removed is deleted.
export async function removeAssociation(
  fromType: AssociableType,
  fromHubspotId: string,
  toType: AssociableType,
  toHubspotId: string,
): Promise<void> {
  const fromAssocType = OBJECT_TYPES[fromType].associationType;
  const toAssocType = OBJECT_TYPES[toType].associationType;

  await db.delete(dynamicAssociation).where(
    or(
      and(
        eq(dynamicAssociation.fromObjectType, fromAssocType),
        eq(dynamicAssociation.fromHubspotId, fromHubspotId),
        eq(dynamicAssociation.toObjectType, toAssocType),
        eq(dynamicAssociation.toHubspotId, toHubspotId),
      ),
      and(
        eq(dynamicAssociation.fromObjectType, toAssocType),
        eq(dynamicAssociation.fromHubspotId, toHubspotId),
        eq(dynamicAssociation.toObjectType, fromAssocType),
        eq(dynamicAssociation.toHubspotId, fromHubspotId),
      ),
    ),
  );
}

import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, readerPool, writerPool } from "../db/client";
import { dynamicAssociation, invoice } from "../db/schema";

// One-off backfill for the "X / N" installment position now shown on
// reseller-type invoices. Only reseller invoices are numbered — MSP
// invoices don't have the concept. For each deal, N is the count of its
// reseller invoices and X is each invoice's 1-based position when sorted
// by due date oldest → newest. An invoice not associated with any deal (or
// missing a due date) is left untouched — there's no ordering to derive it
// from — and reported at the end instead of guessed at.
async function main() {
  const resellerInvoices = await db
    .select({
      id: invoice.id,
      hubspotId: invoice.hubspotId,
      hsDueDate: invoice.hsDueDate,
    })
    .from(invoice)
    .where(and(eq(invoice.typeObj, "reseller"), eq(invoice.archived, false)));

  const dealLinks = await db
    .select({
      invoiceHubspotId: dynamicAssociation.fromHubspotId,
      dealHubspotId: dynamicAssociation.toHubspotId,
    })
    .from(dynamicAssociation)
    .where(and(eq(dynamicAssociation.fromObjectType, "invoices"), eq(dynamicAssociation.toObjectType, "deals")));

  const dealByInvoiceHubspotId = new Map<string, string>();
  for (const link of dealLinks) {
    if (!dealByInvoiceHubspotId.has(link.invoiceHubspotId)) {
      dealByInvoiceHubspotId.set(link.invoiceHubspotId, link.dealHubspotId);
    }
  }

  const groupsByDeal = new Map<string, { id: string; hsDueDate: Date | null }[]>();
  let skippedNoDeal = 0;
  let skippedNoDueDate = 0;

  for (const inv of resellerInvoices) {
    const dealHubspotId = inv.hubspotId ? dealByInvoiceHubspotId.get(inv.hubspotId) : undefined;
    if (!dealHubspotId) {
      skippedNoDeal++;
      continue;
    }
    if (!inv.hsDueDate) {
      skippedNoDueDate++;
      continue;
    }
    const group = groupsByDeal.get(dealHubspotId) ?? [];
    group.push({ id: inv.id, hsDueDate: inv.hsDueDate });
    groupsByDeal.set(dealHubspotId, group);
  }

  let updated = 0;
  for (const group of groupsByDeal.values()) {
    group.sort((a, b) => (a.hsDueDate as Date).getTime() - (b.hsDueDate as Date).getTime());
    const total = group.length;
    for (let i = 0; i < group.length; i++) {
      await db
        .update(invoice)
        .set({ installmentNumber: i + 1, installmentTotal: total })
        .where(eq(invoice.id, group[i].id));
      updated++;
    }
  }

  console.log("Invoice installment backfill complete", {
    resellerInvoicesSeen: resellerInvoices.length,
    dealsProcessed: groupsByDeal.size,
    invoicesUpdated: updated,
    skippedNoDeal,
    skippedNoDueDate,
  });
}

main()
  .then(() => Promise.all([writerPool.end(), readerPool.end()]))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Invoice installment backfill failed", error);
    process.exit(1);
  });

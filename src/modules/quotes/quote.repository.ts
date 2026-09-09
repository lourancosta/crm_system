import { randomUUID } from "crypto";
import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { ilike } from "../../lib/sqlHelpers";
import { roundMoney } from "../../lib/money";
import { db } from "../../db/client";
import { contactLite as contact } from "../../db/lightTables";
import { company, deal, dynamicAssociation, lineItem, product, quote, quoteDiscount, quoteSigner, users } from "../../db/schema";
import { scopeCondition, type RecordAccessScope } from "../../lib/scopeFilter";
import type {
  AssociatedCompany,
  AssociatedContact,
  AssociatedDeal,
  ContactSignerSnapshot,
  CreateLineItemInput,
  CreateQuoteDiscountInput,
  LineItem,
  LineItemDiscountKind,
  PaginatedResult,
  Quote,
  QuoteDiscount,
  QuoteSigner,
  SubmitSignatureInput,
  UpdateLineItemInput,
  UpdateQuoteDiscountInput,
} from "./quote.types";

const quoteColumns = { hubspotId: quote.hubspotId, hubspotOwnerId: quote.hubspotOwnerId };

// Owner/company are correlated subqueries, not joins — mirrors
// payment.repository.ts's `companyName` field exactly (same EXISTS-shaped
// association lookup, just swapped to from_object_type = 'quotes'). Owner is
// resolved via hubspot_owner_id -> users.hubspotOwnerId, the same mapping
// scopeCondition's 'own-internal' case already relies on.
const QUOTE_FIELDS = {
  id: quote.id,
  hubspotId: quote.hubspotId,
  archived: quote.archived,
  hsTitle: quote.hsTitle,
  hsQuoteNumber: quote.hsQuoteNumber,
  hsQuoteStatus: quote.hsQuoteStatus,
  hsQuoteAmount: quote.hsQuoteAmount,
  hsTcv: quote.hsTcv,
  hsCurrency: quote.hsCurrency,
  hsDealName: quote.hsDealName,
  hsExpirationDate: quote.hsExpirationDate,
  hsLastPublishedDate: quote.hsLastPublishedDate,
  // A quote can be signed via two independent paths: natively through this
  // CRM's own buyer/countersign wizard (hsQuoteStatus flips to 'SIGNED',
  // date tracked per-signer in quote_signers — see quote.service.ts's
  // countersignQuote), or as a HubSpot-synced quote actually signed there
  // (crm-migration's is_signed/signed_date columns, derived from HubSpot's
  // independent esign properties since hs_quote_status itself never
  // reflects signing — a synced quote can be simultaneously EXPIRED and
  // signed). Folded together here so callers don't need to know which path
  // produced the signature.
  isSigned: sql<boolean>`(
    coalesce(quotes.is_signed, false) or quotes.hs_quote_status = 'SIGNED'
  )`,
  hsSignedDate: sql<Date | null>`coalesce(
    (select max(qs.signed_at) from quote_signers qs where qs.quote_id = quotes.id),
    quotes.signed_date
  )`,
  hubspotOwnerId: quote.hubspotOwnerId,
  // Note: the outer table is referenced as literal SQL text (`quotes.hubspot_id`),
  // not a `${quote.hubspotId}` interpolation — Drizzle renders a bare column
  // interpolation unqualified (just `"hubspot_id"`), which inside a subquery
  // that itself joins a table with a same-named column (companies.hubspot_id,
  // users.hubspot_owner_id) resolves to the WRONG (inner) table instead of
  // correlating outward. Matches payment.repository.ts's companyName field,
  // which uses this same literal-text form for the same reason.
  ownerName: sql<string | null>`(
    select trim(concat(coalesce(u.first_name, ''), ' ', coalesce(u.last_name, '')))
    from users u
    where u.hubspot_owner_id = quotes.hubspot_owner_id
    limit 1
  )`,
  companyId: sql<string | null>`(
    select c.id from dynamic_associations da
    join companies c on c.hubspot_id = da.to_hubspot_id
    where da.from_object_type = 'quotes' and da.from_hubspot_id = quotes.hubspot_id
      and da.to_object_type = 'companies' and c.archived = false
    order by da.id asc
    limit 1
  )`,
  companyName: sql<string | null>`(
    select c.name from dynamic_associations da
    join companies c on c.hubspot_id = da.to_hubspot_id
    where da.from_object_type = 'quotes' and da.from_hubspot_id = quotes.hubspot_id
      and da.to_object_type = 'companies' and c.archived = false
    order by da.id asc
    limit 1
  )`,
  hsSenderFirstname: quote.hsSenderFirstname,
  hsSenderLastname: quote.hsSenderLastname,
  hsSenderJobtitle: quote.hsSenderJobtitle,
  hsSenderEmail: quote.hsSenderEmail,
  hsSenderPhone: quote.hsSenderPhone,
  hsSenderCompanyName: quote.hsSenderCompanyName,
  // Resolved by matching the sender's plain-text email back to a real user
  // account (the sender fields are a point-in-time copy, not an FK — see
  // hsSenderFirstname etc. above) — null whenever there's no match or that
  // user has never uploaded a photo. Mirrors auth.service.ts's own
  // /api/auth/me/avatar?v=<updatedAt> URL shape, just via the new
  // not-just-"me" GET /api/users/:id/avatar route.
  hsSenderAvatarUrl: sql<string | null>`(
    select case when u.avatar_key is not null
      then concat('/api/users/', u.id, '/avatar?v=', unix_timestamp(u.updated_at))
      else null end
    from users u
    where u.email = quotes.hs_sender_email
    limit 1
  )`,
  hsComments: quote.hsComments,
  hsTerms: quote.hsTerms,
  createdAt: quote.createdAt,
  updatedAt: quote.updatedAt,
};

export async function findAll(
  page: number,
  limit: number,
  search?: string,
  status?: string,
  scope?: RecordAccessScope,
): Promise<PaginatedResult<Quote>> {
  // 'SIGNED' isn't a real hs_quote_status value in synced data (that column
  // only ever holds DRAFT/PUBLISHED/EXPIRED/ARCHIVED — see QUOTE_FIELDS'
  // isSigned comment) — filter on the derived column instead so a quote
  // that's e.g. EXPIRED-but-signed still shows up under "Signed".
  const statusFilter =
    status === "SIGNED"
      ? sql`(coalesce(${quote.isSigned}, false) or ${quote.hsQuoteStatus} = 'SIGNED')`
      : status
        ? eq(quote.hsQuoteStatus, status)
        : undefined;

  const where = and(
    eq(quote.archived, false),
    search ? ilike(quote.hsTitle, `%${search}%`) : undefined,
    statusFilter,
    scopeCondition(scope, "quotes", quoteColumns),
  );

  const [data, countResult] = await Promise.all([
    db
      .select(QUOTE_FIELDS)
      .from(quote)
      .where(where)
      .orderBy(desc(quote.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(quote).where(where),
  ]);

  return { data, total: Number(countResult[0].count), page, limit };
}

export async function findById(id: string, scope?: RecordAccessScope): Promise<Quote | null> {
  const rows = await db
    .select(QUOTE_FIELDS)
    .from(quote)
    .where(and(eq(quote.id, id), eq(quote.archived, false), scopeCondition(scope, "quotes", quoteColumns)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findAssociatedCompanies(quoteId: string): Promise<AssociatedCompany[]> {
  return db
    .selectDistinct({
      id: company.id,
      name: company.name,
      domain: company.domain,
      website: company.website,
    })
    .from(quote)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "quotes"),
        eq(dynamicAssociation.fromHubspotId, quote.hubspotId),
        eq(dynamicAssociation.toObjectType, "companies"),
      ),
    )
    .innerJoin(company, eq(company.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(quote.id, quoteId), eq(company.archived, false)));
}

export async function findAssociatedDeals(quoteId: string): Promise<AssociatedDeal[]> {
  return db
    .selectDistinct({
      id: deal.id,
      dealname: deal.dealname,
      amount: deal.amount,
      closedate: deal.closedate,
    })
    .from(quote)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "quotes"),
        eq(dynamicAssociation.fromHubspotId, quote.hubspotId),
        eq(dynamicAssociation.toObjectType, "deals"),
      ),
    )
    .innerJoin(deal, eq(deal.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(quote.id, quoteId), eq(deal.archived, false)));
}

export async function findAssociatedContacts(quoteId: string): Promise<AssociatedContact[]> {
  return db
    .selectDistinct({
      id: contact.id,
      firstname: contact.firstname,
      lastname: contact.lastname,
      email: contact.email,
      phone: contact.phone,
      jobtitle: contact.jobtitle,
      company: contact.company,
    })
    .from(quote)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "quotes"),
        eq(dynamicAssociation.fromHubspotId, quote.hubspotId),
        eq(dynamicAssociation.toObjectType, "contacts"),
      ),
    )
    .innerJoin(contact, eq(contact.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(quote.id, quoteId), eq(contact.archived, false)));
}

// Bidirectional dynamic_associations inserts, mirroring
// invoice.repository.ts's create() association block exactly. Not called
// from any route yet — this is the "association flow" groundwork for the
// future quote create/edit workflow, which will call these once it exists.
export async function associateCompany(quoteHubspotId: string, companyHubspotId: string): Promise<void> {
  await db.insert(dynamicAssociation).values([
    {
      fromObjectType: "quotes",
      fromHubspotId: quoteHubspotId,
      toObjectType: "companies",
      toHubspotId: companyHubspotId,
      associationLabel: "quote_to_company",
    },
    {
      fromObjectType: "companies",
      fromHubspotId: companyHubspotId,
      toObjectType: "quotes",
      toHubspotId: quoteHubspotId,
      associationLabel: "company_to_quote",
    },
  ]);
}

export async function associateDeal(quoteHubspotId: string, dealHubspotId: string): Promise<void> {
  await db.insert(dynamicAssociation).values([
    {
      fromObjectType: "quotes",
      fromHubspotId: quoteHubspotId,
      toObjectType: "deals",
      toHubspotId: dealHubspotId,
      associationLabel: "quote_to_deal",
    },
    {
      fromObjectType: "deals",
      fromHubspotId: dealHubspotId,
      toObjectType: "quotes",
      toHubspotId: quoteHubspotId,
      associationLabel: "deal_to_quote",
    },
  ]);
}

export async function associateContact(quoteHubspotId: string, contactHubspotId: string): Promise<void> {
  await db.insert(dynamicAssociation).values([
    {
      fromObjectType: "quotes",
      fromHubspotId: quoteHubspotId,
      toObjectType: "contacts",
      toHubspotId: contactHubspotId,
      associationLabel: "quote_to_contact",
    },
    {
      fromObjectType: "contacts",
      fromHubspotId: contactHubspotId,
      toObjectType: "quotes",
      toHubspotId: quoteHubspotId,
      associationLabel: "contact_to_quote",
    },
  ]);
}

// Creates a bare native draft quote (synthetic hubspotId, mirrors
// invoiceRepository.create()'s pattern) and immediately associates it with
// the chosen deal — the wizard's Deal step is the first thing that persists
// anything, so a quote and its deal association always come into existence
// together.
export async function create(dealHubspotId: string, dealName: string | null, expirationDate?: Date): Promise<Quote> {
  const id = randomUUID();
  const hubspotId = `local-${id}`;

  await db.insert(quote).values({
    id,
    hubspotId,
    archived: false,
    hsQuoteStatus: "DRAFT",
    hsTitle: dealName,
    hsDealName: dealName,
    ...(expirationDate !== undefined ? { hsExpirationDate: expirationDate } : {}),
  });

  await associateDeal(hubspotId, dealHubspotId);

  const rows = await db.select(QUOTE_FIELDS).from(quote).where(eq(quote.id, id)).limit(1);
  return rows[0];
}

// Re-points the quote's deal association (old one removed, new one inserted)
// — used when the wizard's Deal step is revisited and a different deal is
// picked. Mirrors invoice.repository.ts's updateDetails re-pointing block.
export async function replaceDealAssociation(quoteHubspotId: string, dealHubspotId: string): Promise<void> {
  await db.delete(dynamicAssociation).where(
    or(
      and(
        eq(dynamicAssociation.fromObjectType, "quotes"),
        eq(dynamicAssociation.fromHubspotId, quoteHubspotId),
        eq(dynamicAssociation.toObjectType, "deals"),
      ),
      and(
        eq(dynamicAssociation.fromObjectType, "deals"),
        eq(dynamicAssociation.toObjectType, "quotes"),
        eq(dynamicAssociation.toHubspotId, quoteHubspotId),
      ),
    ),
  );
  await associateDeal(quoteHubspotId, dealHubspotId);
}

// Shared by replaceBuyerAssociations and clearBuyerAssociations below —
// removes the quote's existing company/contact associations (both
// directions), leaving deal/line-item/discount associations untouched.
async function deleteBuyerAssociations(quoteHubspotId: string): Promise<void> {
  await db.delete(dynamicAssociation).where(
    or(
      and(
        eq(dynamicAssociation.fromObjectType, "quotes"),
        eq(dynamicAssociation.fromHubspotId, quoteHubspotId),
        eq(dynamicAssociation.toObjectType, "companies"),
      ),
      and(
        eq(dynamicAssociation.fromObjectType, "companies"),
        eq(dynamicAssociation.toObjectType, "quotes"),
        eq(dynamicAssociation.toHubspotId, quoteHubspotId),
      ),
    ),
  );
  await db.delete(dynamicAssociation).where(
    or(
      and(
        eq(dynamicAssociation.fromObjectType, "quotes"),
        eq(dynamicAssociation.fromHubspotId, quoteHubspotId),
        eq(dynamicAssociation.toObjectType, "contacts"),
      ),
      and(
        eq(dynamicAssociation.fromObjectType, "contacts"),
        eq(dynamicAssociation.toObjectType, "quotes"),
        eq(dynamicAssociation.toHubspotId, quoteHubspotId),
      ),
    ),
  );
}

// Re-points the quote's buyer (one company + zero-or-more contacts) — old
// associations of both kinds are cleared first, then the new selection is
// inserted, same "delete then insert fresh" shape as replaceDealAssociation.
export async function replaceBuyerAssociations(
  quoteHubspotId: string,
  companyHubspotId: string,
  contactHubspotIds: string[],
): Promise<void> {
  await deleteBuyerAssociations(quoteHubspotId);
  await associateCompany(quoteHubspotId, companyHubspotId);
  for (const contactHubspotId of contactHubspotIds) {
    await associateContact(quoteHubspotId, contactHubspotId);
  }
}

// Called whenever the quote's deal is re-pointed to a different one (see
// updateQuoteDeal) — the previously-selected company/contacts belonged to
// the OLD deal's own associated records and are almost never still valid for
// the new deal, so they're dropped rather than left stale. The wizard's own
// Buyer Info step already forces a fresh pick before the wizard can move
// past it (its Next button stays disabled until one's made), but this
// guards the data itself in case the deal is changed and saved without ever
// revisiting that step again.
export async function clearBuyerAssociations(quoteHubspotId: string): Promise<void> {
  await deleteBuyerAssociations(quoteHubspotId);
}

export type UpdateQuoteSenderInput = {
  firstname?: string;
  lastname?: string;
  jobtitle?: string;
  email?: string;
  phone?: string;
  companyName?: string;
};

export async function updateSender(id: string, input: UpdateQuoteSenderInput): Promise<void> {
  await db
    .update(quote)
    .set({
      ...(input.firstname !== undefined ? { hsSenderFirstname: input.firstname } : {}),
      ...(input.lastname !== undefined ? { hsSenderLastname: input.lastname } : {}),
      ...(input.jobtitle !== undefined ? { hsSenderJobtitle: input.jobtitle } : {}),
      ...(input.email !== undefined ? { hsSenderEmail: input.email } : {}),
      ...(input.phone !== undefined ? { hsSenderPhone: input.phone } : {}),
      ...(input.companyName !== undefined ? { hsSenderCompanyName: input.companyName } : {}),
      updatedAt: new Date(),
    })
    .where(eq(quote.id, id));
}

export type UpdateQuoteDetailsInput = {
  name?: string;
  expirationDate?: Date;
  commentsToBuyer?: string;
  purchaseTerms?: string;
};

export async function updateDetails(id: string, input: UpdateQuoteDetailsInput): Promise<void> {
  await db
    .update(quote)
    .set({
      ...(input.name !== undefined ? { hsTitle: input.name } : {}),
      ...(input.expirationDate !== undefined ? { hsExpirationDate: input.expirationDate } : {}),
      ...(input.commentsToBuyer !== undefined ? { hsComments: input.commentsToBuyer } : {}),
      ...(input.purchaseTerms !== undefined ? { hsTerms: input.purchaseTerms } : {}),
      updatedAt: new Date(),
    })
    .where(eq(quote.id, id));
}

// Publish (Review step's "Create" button) / recall (an internal user pulling
// a published quote back to Draft to make further edits) — recalling doesn't
// clear hsLastPublishedDate, so "last published" stays a real history marker
// even while the quote is back in Draft and its public link is unavailable.
export async function setStatus(
  id: string,
  status: "DRAFT" | "PUBLISHED" | "AWAITING_COUNTERSIGNATURE" | "SIGNED",
): Promise<void> {
  await db
    .update(quote)
    .set({
      hsQuoteStatus: status,
      ...(status === "PUBLISHED" ? { hsLastPublishedDate: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(quote.id, id));
}

// Hard delete — unlike every other object's soft-archive remove(), deleting a
// quote actually erases the row itself, its line items (native to this quote
// alone: createLineItem always mints a fresh local-<uuid> hubspotId, never a
// shared/reused one, so no other quote/invoice can reference them), its
// global discounts, and every dynamic_associations row that pointed at it —
// otherwise those would be left orphaned once the line items are gone.
export async function remove(id: string, scope?: RecordAccessScope): Promise<boolean> {
  const existing = await db
    .select({ id: quote.id, hubspotId: quote.hubspotId })
    .from(quote)
    .where(and(eq(quote.id, id), eq(quote.archived, false), scopeCondition(scope, "quotes", quoteColumns)))
    .limit(1);
  const quoteRow = existing[0];
  if (!quoteRow) return false;

  await db.transaction(async (tx) => {
    const lineItemLinks = await tx
      .select({ toHubspotId: dynamicAssociation.toHubspotId })
      .from(dynamicAssociation)
      .where(
        and(
          eq(dynamicAssociation.fromObjectType, "quotes"),
          eq(dynamicAssociation.fromHubspotId, quoteRow.hubspotId),
          eq(dynamicAssociation.toObjectType, "line_items"),
        ),
      );
    const lineItemHubspotIds = lineItemLinks.map((l) => l.toHubspotId);
    if (lineItemHubspotIds.length > 0) {
      await tx.delete(lineItem).where(inArray(lineItem.hubspotId, lineItemHubspotIds));
    }

    await tx.delete(quoteDiscount).where(eq(quoteDiscount.quoteId, id));
    await tx.delete(quoteSigner).where(eq(quoteSigner.quoteId, id));

    await tx.delete(dynamicAssociation).where(
      or(
        and(eq(dynamicAssociation.fromObjectType, "quotes"), eq(dynamicAssociation.fromHubspotId, quoteRow.hubspotId)),
        and(eq(dynamicAssociation.toObjectType, "quotes"), eq(dynamicAssociation.toHubspotId, quoteRow.hubspotId)),
      ),
    );

    await tx.delete(quote).where(eq(quote.id, id));
  });

  return true;
}

// ---- Line items ----
// Mirrors invoice.repository.ts's line-item handling exactly — line_items is
// a shared dynamic.* table, associated to its parent (invoice OR quote)
// purely through dynamic_associations, matched on hubspot_id text columns.

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
  hsBillingStartDelayType: lineItem.hsBillingStartDelayType,
  hsBillingStartDelayDays: lineItem.hsBillingStartDelayDays,
  hsBillingStartDelayMonths: lineItem.hsBillingStartDelayMonths,
  hsRecurringBillingStartDate: lineItem.hsRecurringBillingStartDate,
  hsTermInMonths: lineItem.hsTermInMonths,
};

export async function findLineItemsByQuote(quoteId: string): Promise<LineItem[]> {
  return db
    .selectDistinct(LINE_ITEM_FIELDS)
    .from(quote)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "quotes"),
        eq(dynamicAssociation.fromHubspotId, quote.hubspotId),
        eq(dynamicAssociation.toObjectType, "line_items"),
      ),
    )
    .innerJoin(lineItem, eq(lineItem.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(quote.id, quoteId), eq(lineItem.archived, false)))
    .orderBy(asc(lineItem.hsPositionOnQuote));
}

// Persists the table's drag-and-drop order — lineItemIds is the full row
// order after the drag, and each item's new index becomes its
// hsPositionOnQuote. Filtered against this quote's own line items first
// (mirrors pipeline.repository.ts's reorderStages scoping) so an id from
// another quote can't be smuggled in.
export async function reorderLineItems(quoteId: string, lineItemIds: string[]): Promise<void> {
  const existing = await findLineItemsByQuote(quoteId);
  const validIds = new Set(existing.map((li) => li.id));
  await Promise.all(
    lineItemIds
      .filter((id) => validIds.has(id))
      .map((id, index) =>
        db
          .update(lineItem)
          .set({ hsPositionOnQuote: String(index), updatedAt: new Date() })
          .where(eq(lineItem.id, id)),
      ),
  );
}

// line_items has no FK to its parent quote — a newly-created line item needs
// a synthetic hubspotId before it can be associated, mirroring
// invoice.repository.ts's createLineItem() pattern exactly.
export async function createLineItem(quoteRow: Quote, input: CreateLineItemInput): Promise<LineItem> {
  const productRows = await db
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
  const discountType: LineItemDiscountKind = input.discountType ?? "percentage";
  const discountPct = discountType === "percentage" ? (input.hsDiscountPercentage ?? 0) : 0;
  const discountAmount = discountType === "amount" ? (input.discount ?? 0) : 0;
  const effectiveUnitPrice =
    discountType === "amount" ? Math.max(0, price - discountAmount) : price * (1 - discountPct / 100);
  const amount = effectiveUnitPrice * input.quantity;
  const id = randomUUID();
  const hubspotId = `local-${id}`;

  await db.insert(lineItem).values({
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
    // Defaults to 'one_time' — the standard starting point for a freshly
    // added line item (matches LineItemsStep.tsx's own rowFromLineItem
    // fallback). A recurring frequency is something the user opts into
    // explicitly, at which point they also have to set a Term of at least 2
    // periods (see the wizard's isTermValidForFrequency) — a single period is
    // a one-time payment in substance, whatever label it's given. Every
    // product's price is still always a per-month amount regardless of
    // billing frequency (recurringbillingfrequency is a quote-specific
    // override, same as customerName/description already are).
    recurringbillingfrequency: input.recurringbillingfrequency ?? "one_time",
    hsProductType: prod.hsProductType,
    hsProductId: prod.hsObjectId,
    hsLineItemCurrencyCode: quoteRow.hsCurrency,
    hsBillingStartDelayType: input.hsBillingStartDelayType ?? "at_payment",
    hsBillingStartDelayDays: input.hsBillingStartDelayDays !== undefined ? String(input.hsBillingStartDelayDays) : null,
    hsBillingStartDelayMonths:
      input.hsBillingStartDelayMonths !== undefined ? String(input.hsBillingStartDelayMonths) : null,
    hsRecurringBillingStartDate: input.hsRecurringBillingStartDate ?? null,
    hsTermInMonths: input.hsTermInMonths !== undefined ? String(input.hsTermInMonths) : null,
  });

  await db.insert(dynamicAssociation).values([
    {
      fromObjectType: "quotes",
      fromHubspotId: quoteRow.hubspotId,
      toObjectType: "line_items",
      toHubspotId: hubspotId,
      associationLabel: "quote_to_line_item",
    },
    {
      fromObjectType: "line_items",
      fromHubspotId: hubspotId,
      toObjectType: "quotes",
      toHubspotId: quoteRow.hubspotId,
      associationLabel: "line_item_to_quote",
    },
  ]);

  const rows = await db.select(LINE_ITEM_FIELDS).from(lineItem).where(eq(lineItem.id, id)).limit(1);
  return rows[0];
}

// Which quote a line item belongs to, via the reverse dynamic_associations
// direction inserted by createLineItem — used to guard individual line-item
// mutations against being aimed at the wrong quote.
export async function findQuoteIdForLineItem(lineItemId: string): Promise<string | null> {
  const rows = await db
    .select({ quoteId: quote.id })
    .from(lineItem)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, "line_items"),
        eq(dynamicAssociation.fromHubspotId, lineItem.hubspotId),
        eq(dynamicAssociation.toObjectType, "quotes"),
      ),
    )
    .innerJoin(quote, eq(quote.hubspotId, dynamicAssociation.toHubspotId))
    .where(eq(lineItem.id, lineItemId))
    .limit(1);
  return rows[0]?.quoteId ?? null;
}

export async function updateLineItem(id: string, input: UpdateLineItemInput): Promise<LineItem | null> {
  const current = await db.select(LINE_ITEM_FIELDS).from(lineItem).where(eq(lineItem.id, id)).limit(1);
  const existing = current[0];
  if (!existing) return null;

  const quantity = input.quantity ?? Number(existing.quantity ?? 1);
  const price = input.price ?? Number(existing.price ?? 0);
  const discountType: LineItemDiscountKind = (input.discountType ?? existing.discountType) === "amount" ? "amount" : "percentage";
  const discountPct = input.hsDiscountPercentage !== undefined ? (input.hsDiscountPercentage ?? 0) : Number(existing.hsDiscountPercentage ?? 0);
  const discountAmount = input.discount !== undefined ? (input.discount ?? 0) : Number(existing.discount ?? 0);
  const effectiveUnitPrice =
    discountType === "amount" ? Math.max(0, price - discountAmount) : price * (1 - discountPct / 100);
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
      ...(input.hsBillingStartDelayType !== undefined
        ? { hsBillingStartDelayType: input.hsBillingStartDelayType }
        : {}),
      ...(input.hsBillingStartDelayDays !== undefined
        ? { hsBillingStartDelayDays: input.hsBillingStartDelayDays === null ? null : String(input.hsBillingStartDelayDays) }
        : {}),
      ...(input.hsBillingStartDelayMonths !== undefined
        ? {
            hsBillingStartDelayMonths:
              input.hsBillingStartDelayMonths === null ? null : String(input.hsBillingStartDelayMonths),
          }
        : {}),
      ...(input.hsRecurringBillingStartDate !== undefined
        ? { hsRecurringBillingStartDate: input.hsRecurringBillingStartDate }
        : {}),
      ...(input.hsTermInMonths !== undefined ? { hsTermInMonths: String(input.hsTermInMonths) } : {}),
      ...(input.recurringbillingfrequency !== undefined
        ? { recurringbillingfrequency: input.recurringbillingfrequency }
        : {}),
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

// ---- Discounts ----

const DISCOUNT_FIELDS = {
  id: quoteDiscount.id,
  quoteId: quoteDiscount.quoteId,
  name: quoteDiscount.name,
  kind: quoteDiscount.kind,
  value: quoteDiscount.value,
  sortOrder: quoteDiscount.sortOrder,
};

export async function findDiscountsByQuote(quoteId: string): Promise<QuoteDiscount[]> {
  const rows = await db
    .select(DISCOUNT_FIELDS)
    .from(quoteDiscount)
    .where(eq(quoteDiscount.quoteId, quoteId))
    .orderBy(asc(quoteDiscount.sortOrder), asc(quoteDiscount.createdAt));
  return rows as QuoteDiscount[];
}

export async function createDiscount(quoteId: string, input: CreateQuoteDiscountInput): Promise<QuoteDiscount> {
  const id = randomUUID();
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${quoteDiscount.sortOrder}), -1)` })
    .from(quoteDiscount)
    .where(eq(quoteDiscount.quoteId, quoteId));

  await db.insert(quoteDiscount).values({
    id,
    quoteId,
    name: input.name,
    kind: input.kind,
    value: String(input.value),
    sortOrder: Number(maxOrder) + 1,
  });

  const rows = await db.select(DISCOUNT_FIELDS).from(quoteDiscount).where(eq(quoteDiscount.id, id)).limit(1);
  return rows[0] as QuoteDiscount;
}

export async function updateDiscount(
  quoteId: string,
  id: string,
  input: UpdateQuoteDiscountInput,
): Promise<QuoteDiscount | null> {
  await db
    .update(quoteDiscount)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.value !== undefined ? { value: String(input.value) } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(quoteDiscount.id, id), eq(quoteDiscount.quoteId, quoteId)));
  const rows = await db
    .select(DISCOUNT_FIELDS)
    .from(quoteDiscount)
    .where(and(eq(quoteDiscount.id, id), eq(quoteDiscount.quoteId, quoteId)))
    .limit(1);
  return (rows[0] as QuoteDiscount) ?? null;
}

export async function removeDiscount(quoteId: string, id: string): Promise<boolean> {
  const [result] = await db
    .delete(quoteDiscount)
    .where(and(eq(quoteDiscount.id, id), eq(quoteDiscount.quoteId, quoteId)));
  return result.affectedRows > 0;
}

// Keeps the quote's own hs_quote_amount in sync with its line items + global
// discounts, the same way invoice.repository.ts's recalculateAmountBilled
// keeps hs_amount_billed in sync — otherwise a natively-created quote's
// Amount would never reflect what's actually on it.
export async function recalculateQuoteAmount(quoteId: string): Promise<void> {
  const items = await findLineItemsByQuote(quoteId);
  const lineItemsTotal = items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  // Applied sequentially in sort order (matching HubSpot) — each discount is
  // calculated off the running total left over from the previous one, not
  // independently off the original line-items subtotal.
  const discounts = await findDiscountsByQuote(quoteId);
  const total = roundMoney(
    discounts.reduce((runningTotal, d) => {
      const value = Number(d.value ?? 0);
      const discountAmount = d.kind === "percentage" ? runningTotal * (value / 100) : value;
      return Math.max(0, runningTotal - discountAmount);
    }, lineItemsTotal),
  );

  await db
    .update(quote)
    .set({ hsQuoteAmount: String(total), updatedAt: new Date() })
    .where(eq(quote.id, quoteId));
}

// ---- Signers ----

const SIGNER_FIELDS = {
  id: quoteSigner.id,
  quoteId: quoteSigner.quoteId,
  signerType: quoteSigner.signerType,
  contactId: quoteSigner.contactId,
  userId: quoteSigner.userId,
  method: quoteSigner.method,
  signerName: quoteSigner.signerName,
  signerEmail: quoteSigner.signerEmail,
  tokenExpiresAt: quoteSigner.tokenExpiresAt,
  signatureImage: quoteSigner.signatureImage,
  sortOrder: quoteSigner.sortOrder,
  signedAt: quoteSigner.signedAt,
};

export async function findSignersByQuote(quoteId: string): Promise<QuoteSigner[]> {
  const rows = await db
    .select(SIGNER_FIELDS)
    .from(quoteSigner)
    .where(eq(quoteSigner.quoteId, quoteId))
    .orderBy(asc(quoteSigner.sortOrder), asc(quoteSigner.createdAt));
  return rows as QuoteSigner[];
}

export async function findSignerById(quoteId: string, id: string): Promise<QuoteSigner | null> {
  const rows = await db
    .select(SIGNER_FIELDS)
    .from(quoteSigner)
    .where(and(eq(quoteSigner.id, id), eq(quoteSigner.quoteId, quoteId)))
    .limit(1);
  return (rows[0] as QuoteSigner) ?? null;
}

// Only ever one 'internal' row per quote — the designated countersigner.
export async function findInternalSigner(quoteId: string): Promise<QuoteSigner | null> {
  const rows = await db
    .select(SIGNER_FIELDS)
    .from(quoteSigner)
    .where(and(eq(quoteSigner.quoteId, quoteId), eq(quoteSigner.signerType, "internal")))
    .limit(1);
  return (rows[0] as QuoteSigner) ?? null;
}

// Wizard's Signature step explicitly overriding the countersigner for just
// this quote (see quote.service.ts's updateQuoteSigners) — clears any prior
// choice first since there's only ever one 'internal' row per quote.
export async function deleteInternalSigner(quoteId: string): Promise<void> {
  await db.delete(quoteSigner).where(and(eq(quoteSigner.quoteId, quoteId), eq(quoteSigner.signerType, "internal")));
}

export async function findSignerByTokenHash(tokenHash: string): Promise<QuoteSigner | null> {
  const rows = await db.select(SIGNER_FIELDS).from(quoteSigner).where(eq(quoteSigner.tokenHash, tokenHash)).limit(1);
  return (rows[0] as QuoteSigner) ?? null;
}

// Wizard's Signature step — delete-then-recreate the 'contact' rows for this
// quote, same shape as replaceBuyerAssociations above. Never touches the
// 'internal' row (that's only ever created at publish time, from whatever
// Settings > Objects > Quote > Signature says at that moment).
export async function replaceRequiredContactSigners(quoteId: string, signers: ContactSignerSnapshot[]): Promise<void> {
  await db.delete(quoteSigner).where(and(eq(quoteSigner.quoteId, quoteId), eq(quoteSigner.signerType, "contact")));
  for (let i = 0; i < signers.length; i++) {
    const s = signers[i];
    await db.insert(quoteSigner).values({
      quoteId,
      signerType: "contact",
      contactId: s.contactId,
      signerName: s.signerName,
      signerEmail: s.signerEmail,
      sortOrder: i,
    });
  }
}

export async function setSignerToken(id: string, tokenHash: string, expiresAt: Date): Promise<void> {
  await db.update(quoteSigner).set({ tokenHash, tokenExpiresAt: expiresAt }).where(eq(quoteSigner.id, id));
}

export async function createInternalSigner(
  quoteId: string,
  userId: string,
  signerName: string,
  signerEmail: string | null,
): Promise<QuoteSigner> {
  const id = randomUUID();
  await db
    .insert(quoteSigner)
    .values({ id, quoteId, signerType: "internal", userId, signerName, signerEmail });
  const rows = await db.select(SIGNER_FIELDS).from(quoteSigner).where(eq(quoteSigner.id, id)).limit(1);
  return rows[0] as QuoteSigner;
}

export async function markSignerSigned(id: string, input: SubmitSignatureInput): Promise<QuoteSigner> {
  await db
    .update(quoteSigner)
    .set({
      signatureImage: input.signatureImage,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      signedAt: new Date(),
    })
    .where(eq(quoteSigner.id, id));
  const rows = await db.select(SIGNER_FIELDS).from(quoteSigner).where(eq(quoteSigner.id, id)).limit(1);
  return rows[0] as QuoteSigner;
}

// Recalling a quote back to Draft (see quote.service.ts's recallQuote) wipes
// every signer row, contact and internal alike — re-publishing regenerates
// them fresh (new tokens, a re-snapshotted internal signer from whatever
// Settings currently says), since editing implies starting the signature
// process over.
export async function deleteSignersByQuote(quoteId: string): Promise<void> {
  await db.delete(quoteSigner).where(eq(quoteSigner.quoteId, quoteId));
}

export async function allContactSignersSigned(quoteId: string): Promise<boolean> {
  const rows = await db
    .select({ signedAt: quoteSigner.signedAt })
    .from(quoteSigner)
    .where(and(eq(quoteSigner.quoteId, quoteId), eq(quoteSigner.signerType, "contact")));
  return rows.length > 0 && rows.every((r) => r.signedAt !== null);
}

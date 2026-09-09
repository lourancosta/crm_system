import { randomUUID } from 'crypto';
import { and, count, desc, eq, getTableColumns, inArray, or, sql } from 'drizzle-orm';
import { ilike } from '../../lib/sqlHelpers';
import { roundMoney } from '../../lib/money';
import { db } from '../../db/client';
import { contactLite as contact, creditMemoLite as creditMemo } from '../../db/lightTables';
import { company, creditMemoApplication, dynamicAssociation, invoice } from '../../db/schema';
import { scopeCondition, type RecordAccessScope } from '../../lib/scopeFilter';
import type {
  AssociatedCompany,
  AssociatedContact,
  AssociatedInvoice,
  AvailableCreditMemo,
  CreditMemo,
  PaginatedResult,
  UpdateCreditMemoInput,
} from './creditMemo.types';

// Allows getNextCreditMemoNumber to participate in create()'s own
// transaction — mirrors invoice.repository.ts's identical DbClient pattern.
type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const OBJECT_TYPE = {
  invoice: 'invoices',
  company: 'companies',
  contact: 'contacts',
  creditMemo: 'credit_memos',
} as const;

const creditMemoColumns = { hubspotId: creditMemo.hubspotId, hubspotOwnerId: creditMemo.hubspotOwnerId };

// appliedAmount: sum of every credit_memo_applications row for this memo,
// across every invoice it's ever been applied to (a memo is a reusable
// pool — see credit_memo_applications). openAmount is derived in JS from
// hsAmountCredited minus that, rather than a second subquery. Written with
// raw table/column names (not interpolated Drizzle objects) — mirrors
// quote.repository.ts's hsSenderAvatarUrl correlated subquery, referencing
// the outer query's table by its physical name the same way.
const APPLIED_AMOUNT_SQL = sql<string>`(
  select coalesce(sum(credit_memo_applications.amount), 0)
  from credit_memo_applications
  where credit_memo_applications.credit_memo_id = credit_memo.id
)`;

function withOpenAmount<T extends { hsAmountCredited: string | null; appliedAmount: string }>(row: T): T & { openAmount: string } {
  const openAmount = (Number(row.hsAmountCredited) || 0) - (Number(row.appliedAmount) || 0);
  return { ...row, openAmount: String(openAmount) };
}

// Same correlated-subquery shape as payment.repository.ts's companyName,
// plus the id so the list page's Company column can link straight to the
// company record.
const COMPANY_ID_SQL = sql<string | null>`(
  select c.id from dynamic_associations da
  join companies c on c.hubspot_id = da.to_hubspot_id
  where da.from_object_type = 'credit_memos' and da.from_hubspot_id = credit_memo.hubspot_id
    and da.to_object_type = 'companies' and c.archived = false
  order by da.id asc
  limit 1
)`;

const COMPANY_NAME_SQL = sql<string | null>`(
  select c.name from dynamic_associations da
  join companies c on c.hubspot_id = da.to_hubspot_id
  where da.from_object_type = 'credit_memos' and da.from_hubspot_id = credit_memo.hubspot_id
    and da.to_object_type = 'companies' and c.archived = false
  order by da.id asc
  limit 1
)`;

// 'unapplied'/'partially_applied'/'applied' mirror CreditMemoStatusBadge's
// creditMemoStatusKey on the client — computed from live application
// totals, not a stored column, so only meaningful for a memo that's neither
// draft nor voided (in practice always 'issued', the only status create()
// ever sets). 'draft'/'voided' filter the stored column directly instead.
function statusCondition(status?: string) {
  if (!status) return undefined;
  if (status === 'voided' || status === 'draft') {
    return eq(creditMemo.hsCreditMemoStatus, status);
  }
  const notDraftOrVoided = sql`(credit_memo.hs_credit_memo_status is null or credit_memo.hs_credit_memo_status not in ('draft', 'voided'))`;
  if (status === 'unapplied') {
    return and(notDraftOrVoided, sql`${APPLIED_AMOUNT_SQL} <= 0`);
  }
  if (status === 'applied') {
    return and(notDraftOrVoided, sql`${APPLIED_AMOUNT_SQL} >= coalesce(credit_memo.hs_amount_credited, 0)`);
  }
  // partially_applied
  return and(
    notDraftOrVoided,
    sql`${APPLIED_AMOUNT_SQL} > 0`,
    sql`${APPLIED_AMOUNT_SQL} < coalesce(credit_memo.hs_amount_credited, 0)`,
  );
}

export async function findAll(
  page: number,
  limit: number,
  search?: string,
  status?: string,
  scope?: RecordAccessScope,
): Promise<PaginatedResult<CreditMemo>> {
  const where = and(
    eq(creditMemo.archived, false),
    search
      ? or(
          ilike(creditMemo.hsNumber, `%${search}%`),
          // No denormalized company-name column here either — match via the
          // associated company directly (mirrors payment.repository.ts).
          sql`EXISTS (
            SELECT 1 FROM dynamic_associations da
            JOIN companies c ON c.hubspot_id = da.to_hubspot_id
            WHERE da.from_object_type = 'credit_memos' AND da.from_hubspot_id = ${creditMemo.hubspotId}
              AND da.to_object_type = 'companies' AND c.archived = false AND LOWER(c.name) LIKE LOWER(${`%${search}%`})
          )`,
        )
      : undefined,
    statusCondition(status),
    scopeCondition(scope, 'creditMemos', creditMemoColumns),
  );

  const [rows, countResult] = await Promise.all([
    db
      .select({ ...getTableColumns(creditMemo), appliedAmount: APPLIED_AMOUNT_SQL, companyId: COMPANY_ID_SQL, companyName: COMPANY_NAME_SQL })
      .from(creditMemo)
      .where(where)
      .orderBy(desc(creditMemo.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(creditMemo).where(where),
  ]);

  return { data: rows.map(withOpenAmount), total: Number(countResult[0].count), page, limit };
}

export async function findById(id: string, scope?: RecordAccessScope): Promise<CreditMemo | null> {
  const rows = await db
    .select({ ...getTableColumns(creditMemo), appliedAmount: APPLIED_AMOUNT_SQL })
    .from(creditMemo)
    .where(and(eq(creditMemo.id, id), eq(creditMemo.archived, false), scopeCondition(scope, 'creditMemos', creditMemoColumns)))
    .limit(1);
  return rows[0] ? withOpenAmount(rows[0]) : null;
}

export type CreateCreditMemoRecordInput = {
  // A credit memo is a company-level reusable balance now (see
  // credit_memo_applications) — it no longer needs to originate from one
  // specific invoice, though it still can (e.g. issued to correct an
  // overbilled invoice).
  invoiceHubspotId?: string;
  amount: string;
  currency: string;
  reason?: string;
  companyHubspotId?: string;
  contactHubspotId?: string;
};

// Credit memo numbers follow an "CRED-<n>" convention (nothing arrives
// synced from HubSpot for these yet — every existing row was natively
// created) — the next one is just the highest existing numeric suffix + 1.
// Falls back to CRED-1 when there are none yet.
export async function getNextCreditMemoNumber(tx: DbClient = db): Promise<string> {
  const rows = await tx.select({ hsNumber: creditMemo.hsNumber }).from(creditMemo);
  let max = 0;
  for (const row of rows) {
    const match = row.hsNumber?.match(/^CRED-(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `CRED-${max + 1}`;
}

export async function create(input: CreateCreditMemoRecordInput): Promise<CreditMemo> {
  return db.transaction(async (tx) => {
    const id = randomUUID();
    const hubspotId = `local-${id}`;
    // Generating the number and inserting inside the same transaction avoids
    // two concurrent creates ever landing on the same number.
    const hsNumber = await getNextCreditMemoNumber(tx);

    await tx
      .insert(creditMemo)
      .values({
        id,
        hubspotId,
        hsNumber,
        hsCreditMemoStatus: 'issued',
        hsAmountCredited: input.amount,
        hsCurrency: input.currency,
        hsComments: input.reason,
        hsCreditMemoDate: new Date(),
        archived: false,
      });
    const rows = await tx.select().from(creditMemo).where(eq(creditMemo.id, id)).limit(1);
    const created = rows[0];

    if (input.invoiceHubspotId) {
      await tx.insert(dynamicAssociation).values([
        {
          fromObjectType: OBJECT_TYPE.invoice,
          fromHubspotId: input.invoiceHubspotId,
          toObjectType: OBJECT_TYPE.creditMemo,
          toHubspotId: hubspotId,
          associationLabel: 'invoice_to_credit_memo',
        },
        {
          fromObjectType: OBJECT_TYPE.creditMemo,
          fromHubspotId: hubspotId,
          toObjectType: OBJECT_TYPE.invoice,
          toHubspotId: input.invoiceHubspotId,
          associationLabel: 'credit_memo_to_invoice',
        },
      ]);
    }

    if (input.companyHubspotId) {
      await tx.insert(dynamicAssociation).values([
        {
          fromObjectType: OBJECT_TYPE.creditMemo,
          fromHubspotId: hubspotId,
          toObjectType: OBJECT_TYPE.company,
          toHubspotId: input.companyHubspotId,
          associationLabel: 'credit_memo_to_company',
        },
        {
          fromObjectType: OBJECT_TYPE.company,
          fromHubspotId: input.companyHubspotId,
          toObjectType: OBJECT_TYPE.creditMemo,
          toHubspotId: hubspotId,
          associationLabel: 'company_to_credit_memo',
        },
      ]);
    }

    if (input.contactHubspotId) {
      await tx.insert(dynamicAssociation).values([
        {
          fromObjectType: OBJECT_TYPE.creditMemo,
          fromHubspotId: hubspotId,
          toObjectType: OBJECT_TYPE.contact,
          toHubspotId: input.contactHubspotId,
          associationLabel: 'credit_memo_to_contact',
        },
        {
          fromObjectType: OBJECT_TYPE.contact,
          fromHubspotId: input.contactHubspotId,
          toObjectType: OBJECT_TYPE.creditMemo,
          toHubspotId: hubspotId,
          associationLabel: 'contact_to_credit_memo',
        },
      ]);
    }

    return { ...created, appliedAmount: '0', openAmount: created.hsAmountCredited ?? '0' };
  });
}

export async function update(id: string, input: UpdateCreditMemoInput, scope?: RecordAccessScope): Promise<CreditMemo | null> {
  const [result] = await db
    .update(creditMemo)
    .set({
      ...(input.amount !== undefined ? { hsAmountCredited: input.amount } : {}),
      ...(input.reason !== undefined ? { hsComments: input.reason } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(creditMemo.id, id), eq(creditMemo.archived, false), scopeCondition(scope, 'creditMemos', creditMemoColumns)));
  // Re-fetched (rather than returned straight from .update()) so
  // openAmount reflects the just-changed hsAmountCredited.
  return result.affectedRows > 0 ? findById(id, scope) : null;
}

// Dedicated targeted update (mirrors invoice.repository.ts's own
// hsInvoiceStatus write inside voidInvoice) rather than going through the
// generic update() above, which only ever touches amount/reason —
// hsCreditMemoStatus is deliberately not exposed via UpdateCreditMemoInput.
export async function voidCreditMemo(id: string, scope?: RecordAccessScope): Promise<CreditMemo | null> {
  const [result] = await db
    .update(creditMemo)
    .set({ hsCreditMemoStatus: 'voided', updatedAt: new Date() })
    .where(and(eq(creditMemo.id, id), eq(creditMemo.archived, false), scopeCondition(scope, 'creditMemos', creditMemoColumns)));
  return result.affectedRows > 0 ? findById(id, scope) : null;
}

// Soft-archive, matching every other object's remove() in this codebase.
export async function remove(id: string, scope?: RecordAccessScope): Promise<boolean> {
  const [result] = await db
    .update(creditMemo)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(creditMemo.id, id), scopeCondition(scope, 'creditMemos', creditMemoColumns)));
  return result.affectedRows > 0;
}

export async function findAssociatedInvoice(creditMemoId: string): Promise<AssociatedInvoice[]> {
  return db
    .selectDistinct({
      id: invoice.id,
      hsNumber: invoice.hsNumber,
      hsInvoiceStatus: invoice.hsInvoiceStatus,
      hsBalanceDue: invoice.hsBalanceDue,
      hsCurrency: invoice.hsCurrency,
      hsDueDate: invoice.hsDueDate,
    })
    .from(creditMemo)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, OBJECT_TYPE.creditMemo),
        eq(dynamicAssociation.fromHubspotId, creditMemo.hubspotId),
        eq(dynamicAssociation.toObjectType, OBJECT_TYPE.invoice),
      ),
    )
    .innerJoin(invoice, eq(invoice.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(creditMemo.id, creditMemoId), eq(invoice.archived, false)));
}

export async function findAssociatedCompanies(creditMemoId: string): Promise<AssociatedCompany[]> {
  return db
    .selectDistinct({
      id: company.id,
      name: company.name,
      domain: company.domain,
      website: company.website,
    })
    .from(creditMemo)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, OBJECT_TYPE.creditMemo),
        eq(dynamicAssociation.fromHubspotId, creditMemo.hubspotId),
        eq(dynamicAssociation.toObjectType, OBJECT_TYPE.company),
      ),
    )
    .innerJoin(company, eq(company.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(creditMemo.id, creditMemoId), eq(company.archived, false)));
}

export async function findAssociatedContacts(creditMemoId: string): Promise<AssociatedContact[]> {
  return db
    .selectDistinct({
      id: contact.id,
      firstname: contact.firstname,
      lastname: contact.lastname,
      email: contact.email,
      jobtitle: contact.jobtitle,
      company: contact.company,
    })
    .from(creditMemo)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, OBJECT_TYPE.creditMemo),
        eq(dynamicAssociation.fromHubspotId, creditMemo.hubspotId),
        eq(dynamicAssociation.toObjectType, OBJECT_TYPE.contact),
      ),
    )
    .innerJoin(contact, eq(contact.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(creditMemo.id, creditMemoId), eq(contact.archived, false)));
}

// Reverse of findAssociatedCompanies above (company -> its credit memos,
// instead of credit memo -> its company) — a company_to_credit_memo
// association row is written by create() above whenever a companyId is
// given, so this direction is already populated wherever that happened.
// excludeInvoiceId lets an invoice being edited exclude its own existing
// applications, so re-adjusting what it already applied isn't blocked by
// its own prior consumption of the memo's balance.
export async function findAvailableForCompany(companyId: string, excludeInvoiceId?: string): Promise<AvailableCreditMemo[]> {
  const candidates = await db
    .selectDistinct({
      id: creditMemo.id,
      hsNumber: creditMemo.hsNumber,
      hsAmountCredited: creditMemo.hsAmountCredited,
      hsCurrency: creditMemo.hsCurrency,
    })
    .from(company)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, OBJECT_TYPE.company),
        eq(dynamicAssociation.fromHubspotId, company.hubspotId),
        eq(dynamicAssociation.toObjectType, OBJECT_TYPE.creditMemo),
      ),
    )
    .innerJoin(creditMemo, eq(creditMemo.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(company.id, companyId), eq(creditMemo.archived, false)));

  if (candidates.length === 0) return [];

  const applied = await db
    .select({
      creditMemoId: creditMemoApplication.creditMemoId,
      total: sql<string>`coalesce(sum(${creditMemoApplication.amount}), 0)`,
    })
    .from(creditMemoApplication)
    .where(
      and(
        inArray(
          creditMemoApplication.creditMemoId,
          candidates.map((c) => c.id),
        ),
        excludeInvoiceId ? sql`${creditMemoApplication.invoiceId} != ${excludeInvoiceId}` : undefined,
      ),
    )
    .groupBy(creditMemoApplication.creditMemoId);

  const appliedById = new Map(applied.map((a) => [a.creditMemoId, Number(a.total)]));

  return candidates
    .map((c) => {
      const credited = Number(c.hsAmountCredited) || 0;
      // Rounded for the same reason as invoice.repository.ts's
      // creditMemoAvailableBalance — a fully-applied memo's real balance is
      // exactly 0, not a sub-cent floating-point residue that would leak it
      // into this "still has balance" list.
      const availableBalance = roundMoney(credited - (appliedById.get(c.id) ?? 0));
      return { ...c, availableBalance: String(availableBalance) };
    })
    .filter((c) => Number(c.availableBalance) > 0);
}

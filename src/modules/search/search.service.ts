import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { Module } from '../../lib/permissions';
import { getContacts } from '../contacts/contact.service';
import { getCompanies } from '../companies/company.service';
import { getDeals } from '../deals/deal.service';
import { getTickets } from '../tickets/ticket.service';
import { getInvoices } from '../invoices/invoice.service';
import { listPayments } from '../payments/payment.service';
import { listCreditMemos } from '../creditMemos/creditMemo.service';
import { getLicenses } from '../licenses/license.service';
import { getPartnerships } from '../partnerships/partnership.service';
import { getQuotes } from '../quotes/quote.service';
import type { SearchResultGroup, SearchResultItem, SearchResultType } from './search.types';

const RESULTS_PER_TYPE = 5;

type SearchEntry = {
  type: SearchResultType;
  module: Module;
  label: string;
  fetch: (term: string, scope: RecordAccessScope | undefined) => Promise<{ data: any[] }>;
  map: (row: any) => SearchResultItem;
};

// One entry per searchable type — each `fetch` reuses that module's own
// already-scoped, already-tested list service function (not a bespoke
// query), so global search behaves exactly like that module's own list page
// search box would.
const ENTRIES: SearchEntry[] = [
  {
    type: 'contact',
    module: 'contacts',
    label: 'Contacts',
    fetch: (term, scope) => getContacts(1, RESULTS_PER_TYPE, term, scope),
    map: (c) => ({
      type: 'contact',
      id: c.id,
      title: [c.firstname, c.lastname].filter(Boolean).join(' ') || c.email || 'Unnamed contact',
      subtitle: c.email,
    }),
  },
  {
    type: 'company',
    module: 'companies',
    label: 'Companies',
    fetch: (term, scope) => getCompanies(1, RESULTS_PER_TYPE, term, scope),
    map: (c) => ({ type: 'company', id: c.id, title: c.name ?? 'Unnamed company', subtitle: c.domain }),
  },
  {
    type: 'deal',
    module: 'deals',
    label: 'Deals',
    fetch: (term, scope) => getDeals(1, RESULTS_PER_TYPE, term, undefined, scope),
    map: (d) => ({ type: 'deal', id: d.id, title: d.dealname ?? 'Unnamed deal', subtitle: null }),
  },
  {
    type: 'ticket',
    module: 'tickets',
    label: 'Tickets',
    fetch: (term, scope) => getTickets(1, RESULTS_PER_TYPE, term, undefined, scope),
    map: (t) => ({ type: 'ticket', id: t.id, title: t.subject ?? 'Untitled ticket', subtitle: null }),
  },
  {
    type: 'invoice',
    module: 'invoices',
    label: 'Invoices',
    fetch: (term, scope) => getInvoices(1, RESULTS_PER_TYPE, term, undefined, undefined, scope),
    map: (i) => ({ type: 'invoice', id: i.id, title: i.hsNumber ?? 'Draft invoice', subtitle: i.hsInvoiceLatestCompanyName }),
  },
  {
    type: 'payment',
    module: 'payments',
    label: 'Payments',
    fetch: (term, scope) => listPayments(1, RESULTS_PER_TYPE, term, scope),
    map: (p) => ({ type: 'payment', id: p.id, title: p.hsPaymentId ?? p.hsReferenceNumber ?? 'Payment', subtitle: p.companyName ?? null }),
  },
  {
    type: 'creditMemo',
    module: 'creditMemos',
    label: 'Credit Memos',
    fetch: (term, scope) => listCreditMemos(1, RESULTS_PER_TYPE, term, undefined, scope),
    map: (cm) => ({ type: 'creditMemo', id: cm.id, title: cm.hsNumber ?? 'Credit memo', subtitle: null }),
  },
  {
    type: 'license',
    module: 'licenses',
    label: 'Licenses',
    fetch: (term, scope) => getLicenses(1, RESULTS_PER_TYPE, term, undefined, undefined, scope),
    map: (l) => ({ type: 'license', id: l.id, title: l.name ?? l.customerName ?? 'License', subtitle: l.partnerName }),
  },
  {
    type: 'partnership',
    module: 'partnerships',
    label: 'Partnerships',
    fetch: (term, scope) => getPartnerships(1, RESULTS_PER_TYPE, term, undefined, scope),
    map: (p) => ({ type: 'partnership', id: p.id, title: p.name ?? 'Unnamed partnership', subtitle: null }),
  },
  {
    type: 'quote',
    module: 'quotes',
    label: 'Quotes',
    fetch: (term, scope) => getQuotes(1, RESULTS_PER_TYPE, term, undefined, scope),
    map: (q) => ({
      type: 'quote',
      id: q.id,
      title: q.hsTitle ?? q.hsQuoteNumber ?? q.hsDealName ?? 'Untitled quote',
      subtitle: q.companyName ?? null,
    }),
  },
];

// Exposed so the controller can resolve a permission grant per module
// without duplicating the list of searched types.
export const SEARCH_TYPES: { type: SearchResultType; module: Module }[] = ENTRIES.map((e) => ({ type: e.type, module: e.module }));

// `scopes` only contains a key for a type the caller may view at all (see
// search.controller.ts) — a type with no key is skipped entirely, not just
// filtered down to zero rows. A present key with value `undefined` means
// "no row-level filter" (an internal caller with 'all' access), same
// convention as every other module's own scope resolution.
export async function globalSearch(
  term: string,
  scopes: Partial<Record<SearchResultType, RecordAccessScope | undefined>>,
): Promise<SearchResultGroup[]> {
  const groups = await Promise.all(
    ENTRIES.filter((entry) => entry.type in scopes).map(async (entry): Promise<SearchResultGroup | null> => {
      const result = await entry.fetch(term, scopes[entry.type]);
      if (result.data.length === 0) return null;
      return { type: entry.type, label: entry.label, items: result.data.map(entry.map) };
    }),
  );
  return groups.filter((g): g is SearchResultGroup => g !== null);
}

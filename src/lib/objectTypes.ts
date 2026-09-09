// Central registry for objects that can be linked via dynamic_associations
// through the generic associations module (src/modules/associations/).
// Most object types use their plain plural name as the from/to literal in
// dynamic_associations, but partnerships and licenses are HubSpot custom
// objects and key off a raw numeric object-type ID instead — previously each
// repo (contact.repository.ts, partnership.repository.ts,
// company.repository.ts) redefined these constants locally; this is the one
// place going forward.
import { contactLite, ticketLite } from "../db/lightTables";
import { company, deal, invoice, license, partnership } from "../db/schema";
import type { Module } from "./permissions";

export const ASSOCIABLE_TYPES = ["contacts", "companies", "deals", "tickets", "partnerships", "licenses", "invoices"] as const;
export type AssociableType = (typeof ASSOCIABLE_TYPES)[number];

type ObjectTypeConfig = {
  // Permission module checked (via resolveModuleGrant) when this type is the
  // "source" side of an association write.
  module: Module;
  // Literal value stored in dynamic_associations.from_object_type /
  // to_object_type for this type.
  associationType: string;
  // Table used to resolve an internal id -> hubspotId, and to check archived.
  table: typeof company | typeof deal | typeof invoice | typeof license | typeof partnership | typeof contactLite | typeof ticketLite;
};

export const OBJECT_TYPES: Record<AssociableType, ObjectTypeConfig> = {
  contacts: { module: "contacts", associationType: "contacts", table: contactLite },
  companies: { module: "companies", associationType: "companies", table: company },
  deals: { module: "deals", associationType: "deals", table: deal },
  tickets: { module: "tickets", associationType: "tickets", table: ticketLite },
  partnerships: { module: "partnerships", associationType: "2-10925772", table: partnership },
  licenses: { module: "licenses", associationType: "2-24278650", table: license },
  invoices: { module: "invoices", associationType: "invoices", table: invoice },
};

function pairKey(a: AssociableType, b: AssociableType): string {
  return [a, b].sort().join(":");
}

// The 11 editable association edges — see the "Editable associations" plan.
// Anything not listed here (quote associations, invoice<->companies/contacts,
// all payment/credit-memo associations) stays read-only: the generic
// associations module rejects writes for any pair not in this set, so the
// restriction holds even if called directly, not just hidden in the UI.
const EDITABLE_PAIRS: [AssociableType, AssociableType][] = [
  ["contacts", "companies"],
  ["contacts", "deals"],
  ["contacts", "partnerships"],
  ["contacts", "tickets"],
  ["companies", "companies"],
  ["companies", "deals"],
  ["companies", "tickets"],
  ["companies", "licenses"],
  ["companies", "partnerships"],
  ["deals", "tickets"],
  ["deals", "invoices"],
];

export const ALLOWED_ASSOCIATION_PAIRS = new Set(EDITABLE_PAIRS.map(([a, b]) => pairKey(a, b)));

export function isAllowedAssociationPair(a: AssociableType, b: AssociableType): boolean {
  return ALLOWED_ASSOCIATION_PAIRS.has(pairKey(a, b));
}

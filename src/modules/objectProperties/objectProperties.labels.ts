import type { ObjectType } from "./objectProperties.schema";

// Object-type words that are redundant once the user has already picked
// that object from the dropdown (e.g. on the "Invoices" object, a property
// called hs_invoice_due_date should just read "Due date").
const OBJECT_NAME_TOKENS: Record<ObjectType, string[]> = {
  contacts: ["contact", "contacts"],
  companies: ["company", "companies"],
  deals: ["deal", "deals"],
  tickets: ["ticket", "tickets"],
  partnerships: ["partnership", "partnerships"],
  quotes: ["quote", "quotes"],
  invoices: ["invoice", "invoices"],
  payments: ["payment", "payments"],
  licenses: ["license", "licenses"],
  creditMemos: ["creditmemo", "credit", "memo"],
  products: ["product", "products"],
};

// Derives a human "property name" from a raw internal name (either a
// HubSpot property name or a plain MySQL column name — both are already
// lower_snake_case). Strips HubSpot's own "hs_" marker and the current
// object's name (both meaningless/redundant once you already know which
// object and that this is a synced property), then sentence-cases the rest.
// Example: "hs_invoice_due_date" on the invoices object -> "Due date".
export function deriveLabel(internalName: string, objectType: ObjectType): string {
  const rawSegments = internalName.toLowerCase().split("_").filter(Boolean);
  if (rawSegments.length === 0) return internalName;

  const withoutHsPrefix = rawSegments[0] === "hs" ? rawSegments.slice(1) : rawSegments;

  const objectTokens = new Set(OBJECT_NAME_TOKENS[objectType]);
  const withoutObjectWords = withoutHsPrefix.filter((s) => !objectTokens.has(s));

  // Never strip down to nothing (e.g. a property literally just called
  // "hs_invoice") — fall back a step at a time rather than showing blank.
  const finalSegments = withoutObjectWords.length > 0 ? withoutObjectWords : withoutHsPrefix.length > 0 ? withoutHsPrefix : rawSegments;

  const joined = finalSegments.join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

// Generates a stable internal slug from an admin-typed group name (e.g.
// "Billing Info" -> "billing_info"), for property_groups.hubspot_group_name.
// Only needs to be unique within the object (enforced by the caller via
// slugifyUnique below) — it's never shown to the user, just the DB's
// internal key, same role HubSpot's own group "name" field used to play
// before groups became fully user-managed.
export function slugify(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "group";
}

// Appends _2, _3, ... until the slug doesn't collide with an existing one.
export function slugifyUnique(label: string, existingSlugs: Set<string>): string {
  const base = slugify(label);
  if (!existingSlugs.has(base)) return base;
  let n = 2;
  while (existingSlugs.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

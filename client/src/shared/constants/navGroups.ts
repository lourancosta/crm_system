import {
  BookOpen,
  Boxes,
  Building2,
  ConciergeBell,
  CreditCard,
  FileSignature,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Handshake,
  KeySquare,
  LayoutDashboard,
  Mail,
  Megaphone,
  Package,
  Receipt,
  Target,
  Ticket,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AccountType } from "../types/index";

// Omitted accountTypes = internal-only (every existing item's current
// behavior, unchanged) — only deals/invoices/tickets/knowledge-base opt
// partner/customer in. landingKey, when set, mirrors a backend
// LANDING_PAGE_OPTIONS entry (src/lib/permissions.ts) — it's what a user can
// pick as their post-login default page under Settings > Your Preferences >
// General > Profile. Left unset for items that aren't a sensible "home"
// (Marketing Emails, Knowledge Base).
// badge is a short nav-only tag (e.g. "Soon" for a not-yet-built feature) —
// purely visual, doesn't affect routing/permissions.
export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  accountTypes?: AccountType[];
  landingKey?: string;
  badge?: string;
};
export type NavGroupDef = { label: string; icon: LucideIcon; items: NavItem[] };

// Single source of truth for the app's CRM object nav — used by both the
// Sidebar and the page-title object switcher, so the two never drift apart.
export const NAV_GROUPS: NavGroupDef[] = [
  {
    label: "CRM",
    icon: Users,
    items: [
      { to: "/contacts", label: "Contacts", icon: User, landingKey: "contacts" },
      { to: "/companies", label: "Companies", icon: Building2, landingKey: "companies" },
      { to: "/deals", label: "Deals", icon: Target, accountTypes: ["internal", "partner"], landingKey: "deals" },
      { to: "/products", label: "Products", icon: Package, landingKey: "products" },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    items: [
      { to: "/marketing/emails", label: "Emails", icon: Mail },
    ],
  },
  {
    label: "Service",
    icon: ConciergeBell,
    items: [
      { to: "/tickets", label: "Tickets", icon: Ticket, accountTypes: ["internal", "partner", "customer"], landingKey: "tickets" },
      { to: "/knowledge-base", label: "Knowledge Base", icon: BookOpen, accountTypes: ["internal", "partner", "customer"] },
      // Not a real feature yet — the page just previews what's coming, so no
      // landingKey (can't be picked as a default landing page).
      { to: "/course", label: "Course", icon: GraduationCap, badge: "Soon" },
    ],
  },
  {
    label: "Revenue",
    icon: Receipt,
    items: [
      { to: "/quotes", label: "Quotes", icon: FileSpreadsheet, landingKey: "quotes" },
      // Not a real feature yet — the page just previews what's coming, so no
      // landingKey (can't be picked as a default landing page).
      { to: "/contracts", label: "Contracts", icon: FileSignature, badge: "Soon" },
      { to: "/invoices", label: "Invoices", icon: FileText, accountTypes: ["internal", "partner"], landingKey: "invoices" },
      { to: "/payments", label: "Payments", icon: CreditCard, landingKey: "payments" },
      { to: "/credit-memos", label: "Credit Memos", icon: Receipt, landingKey: "creditMemos" },
    ],
  },
  {
    label: "Operations",
    icon: Boxes,
    items: [
      { to: "/licenses", label: "Licenses", icon: KeySquare, landingKey: "licenses" },
      { to: "/partnerships", label: "Partnerships", icon: Handshake, landingKey: "partnerships" },
    ],
  },
];

// internal sees every item unchanged (undefined accountTypes = internal-only,
// and internal is always in an explicit list too); partner/customer only see
// items that explicitly opt them in. Empty groups are dropped entirely.
export function navGroupsFor(accountType: AccountType): NavGroupDef[] {
  if (accountType === "internal") return NAV_GROUPS;
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.accountTypes?.includes(accountType)),
  })).filter((group) => group.items.length > 0);
}

// Options for the "default landing page" picker — every landingKey-tagged
// item this accountType can actually see, plus Dashboard (internal-only,
// mirroring the Sidebar's own Dashboard link). Icons reuse the exact same
// LucideIcon each object uses in its own nav entry, so the picker reads as
// the same objects the user already recognizes from the sidebar.
export function landingPageOptionsFor(accountType: AccountType): { value: string; label: string; icon: LucideIcon }[] {
  const options: { value: string; label: string; icon: LucideIcon }[] = [];
  if (accountType === "internal") options.push({ value: "dashboard", label: "Dashboard", icon: LayoutDashboard });
  for (const group of navGroupsFor(accountType)) {
    for (const item of group.items) {
      if (item.landingKey) options.push({ value: item.landingKey, label: item.label, icon: item.icon });
    }
  }
  return options;
}

// Path to redirect to right after login, from the user's saved
// defaultLandingPage key — falls back to '/' for 'dashboard' or any key that
// no longer resolves to a visible nav item (e.g. permissions changed since
// the preference was saved).
export function pathForLandingPage(landingKey: string, accountType: AccountType): string {
  if (landingKey === "dashboard") return "/";
  for (const group of navGroupsFor(accountType)) {
    const item = group.items.find((i) => i.landingKey === landingKey);
    if (item) return item.to;
  }
  return "/";
}

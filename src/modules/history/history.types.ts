// Extend this list as edit/create flows are added for other record types —
// no schema change needed, just a new value here plus a logHistoryEvent(...)
// call at the relevant mutation point.
export const HISTORY_OBJECT_TYPES = [
  'contacts',
  'companies',
  'deals',
  'invoices',
  'partnerships',
  'tickets',
  'payments',
  'products',
  'creditMemos',
  'licenses',
] as const;
export type HistoryObjectType = (typeof HISTORY_OBJECT_TYPES)[number];

// Every object type a user can manually log an activity against — i.e. every
// object type with an Activities tab.
export const HISTORY_LOGGABLE_OBJECT_TYPES = HISTORY_OBJECT_TYPES;
export type HistoryLoggableObjectType = (typeof HISTORY_LOGGABLE_OBJECT_TYPES)[number];

// 'system' covers automated audit entries (created/updated/stage changed);
// the rest are user- or integration-logged activities.
export const HISTORY_ACTIVITY_TYPES = ['system', 'note', 'call', 'meeting', 'email'] as const;
export type HistoryActivityType = (typeof HISTORY_ACTIVITY_TYPES)[number];

// Activity types a user can manually log via the "Log activity" UI. Note
// that 'email' here means a manually-logged record of an email sent/received
// outside the app (e.g. from a personal mailbox) — distinct from the
// system-synced 'email' entries created by emailActivity/engagementActivity,
// which share the same `type` value but are never user-editable (see
// history.service.ts::updateActivity's isManuallyLoggedEmail check).
export const LOGGABLE_ACTIVITY_TYPES = ['note', 'call', 'meeting', 'email'] as const;
export type LoggableActivityType = (typeof LOGGABLE_ACTIVITY_TYPES)[number];

// Only contacts/companies/deals are "who you'd actually call, meet, or email
// directly" — everything else (tickets, invoices, partnerships, payments,
// products, credit memos) is a transactional/operational record, so Call/
// Meeting/Email don't map to it cleanly. Those object types can still log a
// Note. (Tickets already get real synced email activity via the support
// inbox — this is specifically about the manual "Log activity" entry point.)
const FULL_ACTIVITY_TYPE_OBJECT_TYPES = new Set<HistoryLoggableObjectType>(['contacts', 'companies', 'deals']);

export function getAllowedActivityTypes(objectType: HistoryLoggableObjectType): readonly LoggableActivityType[] {
  return FULL_ACTIVITY_TYPE_OBJECT_TYPES.has(objectType) ? LOGGABLE_ACTIVITY_TYPES : (['note'] as const);
}

export type HistoryEntry = {
  id: string;
  objectType: string;
  objectId: string;
  type: HistoryActivityType;
  title: string;
  description: string | null;
  userName: string | null;
  userId: string | null;
  occurredAt: Date;
  activityGroupId: string | null;
};

export type LogHistoryEventInput = {
  objectType: HistoryObjectType;
  objectId: string;
  type?: HistoryActivityType;
  title: string;
  description?: string;
  userId?: string | null;
  activityGroupId?: string | null;
  // Only set when backfilling/logging an event that happened in the past
  // (e.g. a synced HubSpot email) — omit to use the column's defaultNow().
  occurredAt?: Date;
};

export type ActivityAssociationTarget = {
  objectType: HistoryLoggableObjectType;
  objectId: string;
};

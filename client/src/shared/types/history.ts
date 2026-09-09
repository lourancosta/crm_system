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

export const HISTORY_ACTIVITY_TYPES = ['system', 'note', 'call', 'meeting', 'email'] as const;
export type HistoryActivityType = (typeof HISTORY_ACTIVITY_TYPES)[number];

export const LOGGABLE_ACTIVITY_TYPES = ['note', 'call', 'meeting', 'email'] as const;
export type LoggableActivityType = (typeof LOGGABLE_ACTIVITY_TYPES)[number];

// Every object type with an Activities tab that supports "Log activity".
export const HISTORY_LOGGABLE_OBJECT_TYPES = HISTORY_OBJECT_TYPES;
export type HistoryLoggableObjectType = (typeof HISTORY_LOGGABLE_OBJECT_TYPES)[number];

export type HistoryEntry = {
  id: string;
  objectType: string;
  objectId: string;
  type: HistoryActivityType;
  title: string;
  description: string | null;
  userName: string | null;
  occurredAt: string;
};

// A record (of another loggable object type) available to also tag this
// activity against — e.g. when logging on a deal, its associated contacts
// and companies.
export type ActivityAssociationOption = {
  objectType: HistoryLoggableObjectType;
  id: string;
  label: string;
};

export type LogActivityInput = {
  // Omitted when editing an email entry's associations only — email
  // content/type are never user-editable, so that request just carries
  // `associations` (see history.service.ts::updateActivity).
  type?: LoggableActivityType;
  content?: string;
  associations?: { objectType: HistoryLoggableObjectType; objectId: string }[];
  // The exact (objectType, objectId) pairs the editing UI offered as
  // checkboxes — tells the backend which specific records it's safe to
  // add/remove, so it never drops an association this particular screen
  // couldn't represent (e.g. a synced email's ticket association, or a
  // contact not related to the company being edited from).
  associationScopeTargets?: { objectType: HistoryLoggableObjectType; objectId: string }[];
};

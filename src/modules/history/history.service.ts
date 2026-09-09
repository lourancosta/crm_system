import { randomUUID } from 'crypto';
import * as repo from './history.repository';
import type { ListForRecordOptions, ListForRecordResult } from './history.repository';
import { getAllowedActivityTypes, LOGGABLE_ACTIVITY_TYPES } from './history.types';
import type {
  ActivityAssociationTarget,
  HistoryActivityType,
  HistoryLoggableObjectType,
  HistoryObjectType,
  LoggableActivityType,
  LogHistoryEventInput,
} from './history.types';

function targetKey(target: ActivityAssociationTarget) {
  return `${target.objectType}:${target.objectId}`;
}

const EDITABLE_ACTIVITY_TYPES = new Set<string>(LOGGABLE_ACTIVITY_TYPES);

// Email entries (synced from HubSpot, or manually logged — see
// LOGGABLE_ACTIVITY_TYPES) aren't fully editable: content/type are locked
// once created, matching "a record of what was actually sent/received"
// rather than a freely-rewritable note. Associations are still editable —
// same as note/call/meeting — so a user can re-tag which contacts/companies/
// deals an email shows up on without being able to rewrite what it says.
const ASSOCIATION_EDITABLE_ACTIVITY_TYPES = new Set<string>(LOGGABLE_ACTIVITY_TYPES);

function notFound() {
  const error = new Error('Activity not found') as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

function badRequest(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;
  return error;
}

function assertAllowedType(objectType: HistoryLoggableObjectType, type: LoggableActivityType) {
  const allowed = getAllowedActivityTypes(objectType);
  if (!allowed.includes(type)) {
    throw badRequest(`"${type}" activities aren't supported for ${objectType} — allowed: ${allowed.join(', ')}`);
  }
}

export const listForRecord = (
  objectType: HistoryObjectType,
  objectId: string,
  options?: ListForRecordOptions,
): Promise<ListForRecordResult> => repo.listForRecord(objectType, objectId, options);

export const logHistoryEvent = (input: LogHistoryEventInput) => repo.create(input);

const ACTIVITY_TITLES: Record<LoggableActivityType, string> = {
  note: 'Note',
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
};

export async function createActivity(
  objectType: HistoryLoggableObjectType,
  objectId: string,
  data: {
    type: LoggableActivityType;
    content: string;
    associations?: { objectType: HistoryLoggableObjectType; objectId: string }[];
  },
  userId?: string,
) {
  assertAllowedType(objectType, data.type);
  const title = ACTIVITY_TITLES[data.type];

  // A logged activity can be tagged against multiple records (e.g. logging a
  // call on a deal that should also show up on the associated contact) — we
  // dedupe by object so the primary record never gets double-logged if it's
  // also (redundantly) passed in associations.
  const targets = new Map<string, ActivityAssociationTarget>();
  targets.set(targetKey({ objectType, objectId }), { objectType, objectId });
  for (const assoc of data.associations ?? []) {
    targets.set(targetKey(assoc), assoc);
  }

  // Shared across every target row so deleting any one copy can delete them
  // all together (see deleteActivity below).
  const activityGroupId = randomUUID();

  await Promise.all(
    [...targets.values()].map((target) =>
      repo.create({
        objectType: target.objectType,
        objectId: target.objectId,
        type: data.type,
        title,
        description: data.content,
        userId,
        activityGroupId,
      }),
    ),
  );
}

// Entries logged through "Log activity" as note/call/meeting can have their
// content, type, and associations all edited. Email entries (whether synced
// from HubSpot or manually logged — both share type: 'email') can only have
// their associations edited — content/type are locked once created, since
// they're meant to be a record of what was actually sent/received, not a
// freely-rewritable note (see ASSOCIATION_EDITABLE_ACTIVITY_TYPES above).
// System audit entries (created/updated/stage changed) aren't editable at
// all.
export async function updateActivity(
  id: string,
  data: {
    type?: LoggableActivityType;
    content?: string;
    associations?: ActivityAssociationTarget[];
    // The exact (objectType, objectId) pairs the editing UI offered as
    // toggleable checkboxes — i.e. every option shown, checked or not (e.g.
    // a company page only offers contacts/deals belonging to that specific
    // company, not every contact in the CRM). Reconciliation below only ever
    // ADDS/REMOVES a row if its target was actually offered here — anything
    // else (a different type entirely, like a ticket, or a same-type record
    // that just wasn't in this page's list, like an external contact on a
    // synced email) is left untouched rather than silently deleted just
    // because this particular edit screen couldn't represent it.
    associationScopeTargets?: ActivityAssociationTarget[];
  },
) {
  const existing = await repo.findEntryById(id);
  if (!existing || !ASSOCIATION_EDITABLE_ACTIVITY_TYPES.has(existing.type)) throw notFound();

  const isEmail = existing.type === 'email';

  let type: HistoryActivityType;
  let title: string;
  let description: string;

  if (isEmail) {
    if (data.type !== undefined || data.content !== undefined) {
      throw badRequest('Email content and type cannot be edited — only associations can be changed');
    }
    type = existing.type;
    title = existing.title;
    description = existing.description ?? '';
  } else {
    if (data.content === undefined) throw badRequest('content is required');
    type = data.type ?? (existing.type as LoggableActivityType);
    assertAllowedType(existing.objectType as HistoryLoggableObjectType, type as LoggableActivityType);
    title = ACTIVITY_TITLES[type as LoggableActivityType];
    description = data.content;
  }

  const currentTarget: ActivityAssociationTarget = { objectType: existing.objectType as HistoryLoggableObjectType, objectId: existing.objectId };
  const currentKey = targetKey(currentTarget);

  if (!existing.activityGroupId || data.associations === undefined) {
    // No group to reconcile against (legacy row), or the caller didn't touch
    // associations — just update this row's content in place. For emails
    // there's nothing left to change once associations are excluded, so
    // there's no in-place update to make.
    if (isEmail) return;
    await repo.update(id, { type, title, description });
    return;
  }

  const groupRows = await repo.listByGroupId(existing.activityGroupId);
  const existingKeys = new Set(groupRows.map((row) => targetKey({ objectType: row.objectType as HistoryLoggableObjectType, objectId: row.objectId })));

  const desired = new Map<string, ActivityAssociationTarget>();
  desired.set(currentKey, currentTarget); // the record being edited from is never removed
  for (const assoc of data.associations) {
    desired.set(targetKey(assoc), assoc);
  }

  const scopeKeys = new Set<string>((data.associationScopeTargets ?? []).map(targetKey));

  const removeRows = groupRows.filter((row) => {
    if (row.id === id) return false; // never remove the row being edited from
    const key = targetKey({ objectType: row.objectType as HistoryLoggableObjectType, objectId: row.objectId });
    if (desired.has(key)) return false;
    return scopeKeys.has(key); // out-of-scope targets are preserved untouched
  });
  const keepRows = groupRows.filter((row) => !removeRows.some((r) => r.id === row.id));
  const newTargets = [...desired.values()].filter((target) => !existingKeys.has(targetKey(target)));

  await Promise.all([
    ...keepRows.map((row) => repo.update(row.id, { type, title, description })),
    ...removeRows.map((row) => repo.remove(row.id)),
    ...newTargets.map((target) =>
      repo.create({
        objectType: target.objectType,
        objectId: target.objectId,
        type,
        title,
        description,
        userId: existing.userId,
        activityGroupId: existing.activityGroupId,
        // Preserve the original occurrence time on newly-added associations
        // (matters most for emails — a HubSpot email synced months ago must
        // keep its real date on a newly-tagged record, not jump to "now").
        occurredAt: existing.occurredAt,
      }),
    ),
  ]);
}

export async function getActivityAssociations(id: string): Promise<ActivityAssociationTarget[]> {
  const existing = await repo.findEntryById(id);
  if (!existing || !ASSOCIATION_EDITABLE_ACTIVITY_TYPES.has(existing.type)) throw notFound();
  if (!existing.activityGroupId) return [];

  const groupRows = await repo.listByGroupId(existing.activityGroupId);
  return groupRows
    .filter((row) => row.id !== id)
    .map((row) => ({ objectType: row.objectType as HistoryLoggableObjectType, objectId: row.objectId }));
}

export async function deleteActivity(id: string) {
  const existing = await repo.findEntryById(id);
  if (!existing || !EDITABLE_ACTIVITY_TYPES.has(existing.type)) throw notFound();

  // Deleting one copy of an activity removes it from every associated
  // record it was tagged against, not just the one being viewed.
  if (existing.activityGroupId) {
    await repo.removeByGroupId(existing.activityGroupId);
  } else {
    await repo.remove(id);
  }
}

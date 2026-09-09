import * as repo from "./engagementActivity.repository";
import type { CallRecord, EngagementType, MeetingRecord, NoteRecord } from "./engagementActivity.repository";

// Bounds a single page of the backfill/incremental scan, same reasoning as
// emailActivity.service.ts's PAGE_SIZE — one cron tick never holds a huge
// result set in memory or a long-running transaction.
const PAGE_SIZE = 500;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

// HubSpot stores call duration in milliseconds.
function formatDuration(ms: string | null): string | null {
  if (!ms) return null;
  const totalSeconds = Math.round(Number(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatDateTime(date: Date | null): string | null {
  return date ? date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : null;
}

export function describeNote(note: NoteRecord): { title: string; description: string } {
  const body = note.hsNoteBody || note.hsBodyPreviewHtml || note.hsBodyPreview || "";
  return { title: "Note", description: body };
}

// hs_call_disposition is an opaque HubSpot enum GUID with no synced
// human-readable mapping — deliberately not surfaced rather than risk
// showing (or mis-mapping) a raw ID. Direction and duration are plain
// values, safe to show as-is.
export function describeCall(call: CallRecord): { title: string; description: string } {
  const body = call.hsCallBody || call.hsBodyPreviewHtml || call.hsBodyPreview || "";
  const direction = call.hsCallDirection ? titleCase(call.hsCallDirection) : null;
  const duration = formatDuration(call.hsCallDuration);
  const metaParts = [direction && `${direction} call`, duration].filter(Boolean);
  const metaLine = metaParts.length > 0 ? `<p><strong>${escapeHtml(metaParts.join(" · "))}</strong></p>` : "";
  return { title: "Call", description: `${metaLine}${body}` };
}

export function describeMeeting(meeting: MeetingRecord): { title: string; description: string } {
  const body = meeting.hsMeetingBody || meeting.hsBodyPreviewHtml || meeting.hsBodyPreview || "";
  const outcome = meeting.hsMeetingOutcome ? titleCase(meeting.hsMeetingOutcome) : null;
  const start = formatDateTime(meeting.hsMeetingStartTime);
  const end = formatDateTime(meeting.hsMeetingEndTime);
  const when = start && end ? `${start} – ${end}` : start;
  const metaParts = [meeting.hsMeetingTitle, outcome, when, meeting.hsMeetingLocation].filter(Boolean) as string[];
  const metaLine = metaParts.length > 0 ? `<p><strong>${escapeHtml(metaParts.join(" · "))}</strong></p>` : "";
  return { title: "Meeting", description: `${metaLine}${body}` };
}

const runningTypes = new Set<EngagementType>();

// Pulls one engagement type's rows modified since its own watermark, fans
// each one out to its associated contacts/companies/deals/tickets via
// record_history, and advances that type's watermark. Same
// paginated/transactional/safety-valve structure as
// emailActivity.service.ts::processNewEmails — see that file for the
// reasoning behind each piece; this just loops it per engagement type.
export async function processNewEngagements(type: EngagementType): Promise<void> {
  if (runningTypes.has(type)) return;
  runningTypes.add(type);

  try {
    let cursor = await repo.getWatermark(type);

    for (;;) {
      const candidates =
        type === "note"
          ? await repo.findCandidateNotes(cursor, PAGE_SIZE)
          : type === "call"
            ? await repo.findCandidateCalls(cursor, PAGE_SIZE)
            : await repo.findCandidateMeetings(cursor, PAGE_SIZE);
      if (candidates.length === 0) break;

      for (const record of candidates) {
        if (!record.hubspotId) continue;

        try {
          if (await repo.hasProcessed(type, record.hubspotId)) continue;

          const targets = await repo.findAssociatedTargets(type, record.hubspotId);
          const { title, description } =
            type === "note"
              ? describeNote(record as NoteRecord)
              : type === "call"
                ? describeCall(record as CallRecord)
                : describeMeeting(record as MeetingRecord);

          await repo.markProcessedAndLog(type, record.hubspotId, targets, {
            title,
            description,
            occurredAt: record.hsTimestamp ?? record.hsLastmodifieddate ?? new Date(),
          });
        } catch (error) {
          console.error(`Failed to process ${type} ${record.hubspotId}`, error);
        }
      }

      // The last row of the page is always the furthest point reached, since
      // the query orders by (hsLastmodifieddate, id) ascending — no manual
      // max-tracking needed, and (unlike a timestamp-only watermark) this
      // cursor is guaranteed to strictly advance every page regardless of
      // how many rows tie on the same hs_lastmodifieddate, because `id` is
      // always unique.
      const last = candidates[candidates.length - 1];
      const newCursor = { modifiedAt: last.hsLastmodifieddate ?? new Date(0), id: last.id };
      await repo.setWatermark(type, newCursor);

      if (cursor && cursor.modifiedAt.getTime() === newCursor.modifiedAt.getTime() && cursor.id === newCursor.id) {
        // Structurally shouldn't happen (id is unique, so the cursor can
        // never repeat) — a defensive stop rather than an infinite loop if
        // it somehow does.
        console.warn(`processNewEngagements(${type}): cursor did not advance, stopping this run early`);
        break;
      }
      cursor = newCursor;

      if (candidates.length < PAGE_SIZE) break;
    }
  } finally {
    runningTypes.delete(type);
  }
}

import * as repo from "./emailActivity.repository";
import type { EmailRecord } from "./emailActivity.repository";

// Bounds a single page of the backfill/incremental scan so one cron tick
// never holds a huge result set in memory or a long-running transaction.
const PAGE_SIZE = 500;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// hs_email_direction only has two observed values today (EMAIL / INCOMING_EMAIL)
// but HubSpot may surface others in other portals — default to generic
// phrasing rather than throwing on an unrecognized value.
function directionPrefix(direction: string | null): string {
  if (direction === "EMAIL") return "Sent";
  if (direction === "INCOMING_EMAIL") return "Received";
  return "Email";
}

// HubSpot stores multiple participants as parallel semicolon-separated
// lists (emails/firstnames/lastnames meant to line up by index) rather than
// a single structured field — but a participant with no captured name (e.g.
// a shared inbox like support@x.com) is simply OMITTED from the name lists
// rather than left as a blank placeholder, which silently desyncs
// positional pairing for every participant after them. Only zip names in
// when all three lists are actually the same length (i.e. position-for-
// position pairing can be trusted); otherwise fall back to bare email
// addresses for everyone rather than risk attributing the wrong name to the
// wrong address.
function formatEmailParticipants(emails: string | null, firstnames: string | null, lastnames: string | null): string {
  if (!emails) return "";

  const emailList = emails.split(";").map((e) => e.trim()).filter(Boolean);
  const firstList = firstnames === null ? [] : firstnames.split(";").map((f) => f.trim());
  const lastList = lastnames === null ? [] : lastnames.split(";").map((l) => l.trim());

  const canPairNames = firstList.length === emailList.length && lastList.length === emailList.length;

  return emailList
    .map((email, i) => {
      if (!canPairNames) return email;
      const name = [firstList[i], lastList[i]].filter(Boolean).join(" ").trim();
      return name && name !== email ? `${name} <${email}>` : email;
    })
    .join(", ");
}

// The frontend timeline (client/src/shared/utils/historyEvents.ts) strips
// HTML from `description` for type: 'email' entries via htmlToPlainText, so
// it's safe (and expected, matching the existing inbound-email convention)
// to build this as HTML rather than pre-flattened plain text.
export function describeEmail(email: EmailRecord): { title: string; description: string } {
  const subject = email.hsEmailSubject?.trim() || "(no subject)";
  const body = email.hsBodyPreviewHtml || email.hsBodyPreview || "";
  const prefix = directionPrefix(email.hsEmailDirection);

  const from = formatEmailParticipants(email.hsEmailFromEmail, email.hsEmailFromFirstname, email.hsEmailFromLastname);
  const to = formatEmailParticipants(email.hsEmailToEmail, email.hsEmailToFirstname, email.hsEmailToLastname);

  const participantLines = [from && `From: ${escapeHtml(from)}`, to && `To: ${escapeHtml(to)}`].filter(Boolean);
  const participantsBlock = participantLines.length > 0 ? `<p>${participantLines.join("<br>")}</p>` : "";

  return {
    title: "Email",
    description: `<p><strong>${prefix} — ${escapeHtml(subject)}</strong></p>${participantsBlock}<p>${body}</p>`,
  };
}

let isRunning = false;

// Pulls emails modified since the last watermark, fans each one out to its
// associated contacts/companies/deals/tickets via record_history, and
// advances the watermark. Paginated so the initial ~28k-email backfill
// doesn't hold everything in memory or run as one giant transaction — each
// page is its own scan, and each email's fan-out is its own transaction (see
// emailActivity.repository.ts::markProcessedAndLog).
export async function processNewEmails(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    let since = await repo.getWatermark();

    for (;;) {
      const pageStartSince = since;
      const candidates = await repo.findCandidateEmails(since, PAGE_SIZE);
      if (candidates.length === 0) break;

      let maxModifiedSeen = since;

      for (const email of candidates) {
        if (email.hsLastmodifieddate && (!maxModifiedSeen || email.hsLastmodifieddate > maxModifiedSeen)) {
          maxModifiedSeen = email.hsLastmodifieddate;
        }

        if (!email.hubspotId) continue;

        try {
          if (await repo.hasProcessed(email.hubspotId)) continue;

          const targets = await repo.findAssociatedTargets(email.hubspotId);
          const { title, description } = describeEmail(email);

          await repo.markProcessedAndLog(email.hubspotId, targets, {
            title,
            description,
            occurredAt: email.hsTimestamp ?? email.hsLastmodifieddate ?? new Date(),
          });
        } catch (error) {
          console.error(`Failed to process email ${email.hubspotId}`, error);
        }
      }

      if (maxModifiedSeen) {
        await repo.setWatermark(maxModifiedSeen);
        since = maxModifiedSeen;
      }

      if (candidates.length < PAGE_SIZE) break;

      // Safety valve: if a full page of PAGE_SIZE rows all share the exact
      // same hs_lastmodifieddate as the page's starting bound, the watermark
      // never advances and the >= re-scan would repeat this same page
      // forever. Bail out and let the next cron tick retry rather than
      // hanging this run indefinitely (hasProcessed() means no work is lost).
      if (pageStartSince && maxModifiedSeen && maxModifiedSeen.getTime() === pageStartSince.getTime()) {
        console.warn("processNewEmails: watermark did not advance past a full page, stopping this run early");
        break;
      }
    }
  } finally {
    isRunning = false;
  }
}

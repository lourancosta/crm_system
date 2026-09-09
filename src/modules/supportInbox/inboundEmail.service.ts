import { logHistoryEvent } from '../history/history.service';
import * as repo from './inboundEmail.repository';
import type { ParsedInboundEmail } from './inboundEmail.types';
import type { SupportInboxWithSecret } from './supportInbox.types';

// The In-Reply-To header is a single Message-ID; References is a
// whitespace-separated chain of every Message-ID in the thread so far
// (oldest first). Either can identify the ticket this reply belongs to.
export function threadCandidateMessageIds(email: Pick<ParsedInboundEmail, 'inReplyTo' | 'references'>): string[] {
  const ids = new Set<string>();
  if (email.inReplyTo) ids.add(email.inReplyTo.trim());
  for (const ref of email.references ?? []) {
    if (ref.trim()) ids.add(ref.trim());
  }
  return [...ids];
}

// "Jane Doe" -> { firstname: 'Jane', lastname: 'Doe' }. No display name ->
// fall back to the email's local-part as a best-effort first name.
export function resolveContactName(fromName: string | undefined, fromAddress: string): {
  firstname: string;
  lastname: string | null;
} {
  const trimmedName = fromName?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/);
    return { firstname: parts[0], lastname: parts.length > 1 ? parts.slice(1).join(' ') : null };
  }
  const localPart = fromAddress.split('@')[0] || fromAddress;
  return { firstname: localPart, lastname: null };
}

export function buildTicketContent(email: Pick<ParsedInboundEmail, 'subject' | 'text' | 'html'>): {
  subject: string;
  content: string;
} {
  return {
    subject: email.subject?.trim() || 'New support request',
    content: email.html || (email.text ? `<p>${escapeHtml(email.text)}</p>` : ''),
  };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function processInboundEmail(inbox: SupportInboxWithSecret, email: ParsedInboundEmail): Promise<void> {
  // Guards against reprocessing on cron retries: a poll that partially fails
  // only advances lastUid past the messages it actually handled, so the next
  // run refetches the same UID range and would otherwise redo already-processed
  // messages (and, for a new thread, create a second ticket for it).
  if (await repo.hasProcessedMessage(inbox.id, email.messageId)) return;

  const existingContact = await repo.findContactByEmail(email.fromAddress);

  const candidates = threadCandidateMessageIds(email);
  const existingTicketId = await repo.findTicketIdForThread(inbox.id, candidates);

  if (existingTicketId) {
    const description = email.html || email.text || undefined;
    await logHistoryEvent({
      objectType: 'tickets',
      objectId: existingTicketId,
      type: 'email',
      title: 'New email reply received',
      description,
    });
    if (existingContact) {
      await logHistoryEvent({
        objectType: 'contacts',
        objectId: existingContact.id,
        type: 'email',
        title: 'Email received',
        description,
      });
    }
    await repo.recordProcessedEmail(inbox.id, email.messageId, existingTicketId);
    return;
  }

  let contactId: string;
  let contactHubspotId: string | null = null;
  if (existingContact) {
    contactId = existingContact.id;
    contactHubspotId = existingContact.hubspotId;
  } else {
    const { firstname, lastname } = resolveContactName(email.fromName, email.fromAddress);
    const created = await repo.createContact({ email: email.fromAddress, firstname, lastname });
    contactId = created.id;
    contactHubspotId = created.hubspotId;
  }

  const stageNames = await repo.findPipelineStageNames(inbox.pipelineId, inbox.defaultStageId);
  if (!stageNames) {
    throw new Error(`Support inbox "${inbox.name}" has an invalid pipeline/stage configuration`);
  }

  const { subject, content } = buildTicketContent(email);
  const ticket = await repo.createTicketFromEmail({
    subject,
    content,
    hsPipeline: stageNames.pipelineName,
    hsPipelineStage: stageNames.stageName,
    contactHubspotId,
  });

  await logHistoryEvent({
    objectType: 'tickets',
    objectId: ticket.id,
    title: 'Ticket created from inbound email',
  });

  await logHistoryEvent({
    objectType: 'contacts',
    objectId: contactId,
    type: 'email',
    title: 'Email received',
    description: content || undefined,
  });

  await repo.recordProcessedEmail(inbox.id, email.messageId, ticket.id);
}

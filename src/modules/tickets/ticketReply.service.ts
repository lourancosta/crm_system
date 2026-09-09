import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';
import { decrypt } from '../../lib/encryption';
import { logHistoryEvent } from '../history/history.service';
import * as inboxRepo from '../supportInbox/inboundEmail.repository';
import * as supportInboxRepository from '../supportInbox/supportInbox.repository';
import * as ticketRepository from './ticket.repository';
import type { RecordAccessScope } from '../../lib/scopeFilter';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function notFound(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

function badRequest(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;
  return error;
}

// Sends an outbound reply email for a ticket that was created from (or has
// already exchanged replies via) an inbound support inbox — reusing that
// same inbox's own address, so the round trip threads correctly:
// findSupportInboxIdForTicket/findLatestMessageIdForTicket +
// recordProcessedEmail are the exact same plumbing
// src/modules/supportInbox/inboundEmail.poller.ts relies on for inbound mail.
export async function sendTicketReply(ticketId: string, content: string, userId?: string, scope?: RecordAccessScope): Promise<void> {
  const ticket = await ticketRepository.findById(ticketId, scope);
  if (!ticket) throw notFound('Ticket not found');

  const contacts = await ticketRepository.findAssociatedContacts(ticketId);
  const recipient = contacts[0];
  if (!recipient?.email) {
    throw badRequest('This ticket has no associated contact with an email address to reply to.');
  }

  const supportInboxId = await inboxRepo.findSupportInboxIdForTicket(ticketId);
  if (!supportInboxId) {
    throw badRequest("This ticket isn't linked to a support inbox — replies can only be sent for tickets created from inbound email.");
  }

  const inbox = await supportInboxRepository.findByIdWithSecret(supportInboxId);
  if (!inbox) throw notFound('Support inbox not found');

  if (inbox.authType !== 'password') {
    throw badRequest('Replying from the CRM is only supported for password-authenticated support inboxes right now.');
  }
  if (!inbox.smtpHost || !inbox.smtpPort || !inbox.imapPasswordEncrypted) {
    throw badRequest(`Support inbox "${inbox.name}" doesn't have SMTP configured yet — set it up in Settings > Tickets.`);
  }

  const lastMessageId = await inboxRepo.findLatestMessageIdForTicket(ticketId);

  const subject = ticket.subject?.toLowerCase().startsWith('re:') ? ticket.subject : `Re: ${ticket.subject ?? '(no subject)'}`;
  const html = `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>`;
  // The domain has to match the sending address, not the SMTP server
  // hostname — a mismatched Message-ID domain is a spam-filter red flag.
  const senderDomain = inbox.imapUser.split('@')[1] ?? inbox.smtpHost;
  const messageId = `<${randomUUID()}@${senderDomain}>`;

  const transporter = nodemailer.createTransport({
    host: inbox.smtpHost,
    port: inbox.smtpPort,
    secure: false,
    requireTLS: true,
    auth: { user: inbox.imapUser, pass: decrypt(inbox.imapPasswordEncrypted) },
  });

  await transporter.sendMail({
    from: `"${inbox.name}" <${inbox.imapUser}>`,
    to: recipient.email,
    subject,
    text: content,
    html,
    messageId,
    ...(lastMessageId ? { inReplyTo: lastMessageId, references: lastMessageId } : {}),
  });

  await inboxRepo.recordProcessedEmail(inbox.id, messageId, ticketId);

  // Store the same escaped/wrapped HTML that was sent (not the raw typed
  // content) so the frontend's htmlToPlainText — applied uniformly to every
  // type: 'email' history entry, inbound or outbound — round-trips it back
  // to plain text instead of choking on stray "<"/">" the user typed.
  await logHistoryEvent({
    objectType: 'tickets',
    objectId: ticketId,
    type: 'email',
    title: 'Message sent',
    description: html,
    userId,
  });
}

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { decrypt } from '../../lib/encryption';
import { getAccessToken } from '../../lib/microsoftOAuth';
import * as inboxRepo from './supportInbox.repository';
import { processInboundEmail } from './inboundEmail.service';
import type { ParsedInboundEmail } from './inboundEmail.types';
import type { SupportInboxWithSecret } from './supportInbox.types';

async function buildAuth(inbox: SupportInboxWithSecret): Promise<{ user: string; pass?: string; accessToken?: string }> {
  if (inbox.authType === 'microsoft_oauth') {
    if (!inbox.msTenantId || !inbox.msClientId || !inbox.msClientSecretEncrypted) {
      throw new Error(`Support inbox "${inbox.name}" is missing Microsoft OAuth credentials`);
    }
    const accessToken = await getAccessToken({
      tenantId: inbox.msTenantId,
      clientId: inbox.msClientId,
      clientSecret: decrypt(inbox.msClientSecretEncrypted),
    });
    return { user: inbox.imapUser, accessToken };
  }

  if (!inbox.imapPasswordEncrypted) {
    throw new Error(`Support inbox "${inbox.name}" is missing an IMAP password`);
  }
  return { user: inbox.imapUser, pass: decrypt(inbox.imapPasswordEncrypted) };
}

async function pollInbox(inbox: SupportInboxWithSecret): Promise<void> {
  const client = new ImapFlow({
    host: inbox.imapHost,
    port: inbox.imapPort,
    secure: inbox.imapSecure,
    auth: await buildAuth(inbox),
    logger: false,
  });

  // ImapFlow can emit an async 'error' on the underlying socket (e.g. a
  // timeout) well after connect()/a failed auth attempt has already settled
  // — with no listener attached, Node treats that as an unhandled error and
  // crashes the whole process. A bad inbox should only fail its own poll.
  client.on('error', (error) => {
    console.error(`Support inbox "${inbox.name}" IMAP connection error`, error);
  });

  await client.connect();
  try {
    const lock = await client.getMailboxLock(inbox.folder);
    try {
      const mailbox = client.mailbox;
      if (!mailbox || typeof mailbox === 'boolean') return;

      // First-ever poll: don't backfill the mailbox's entire history, just
      // record the current watermark so only mail arriving from now on
      // becomes tickets.
      if (inbox.lastUid === 0) {
        await inboxRepo.updateLastUid(inbox.id, mailbox.uidNext - 1);
        return;
      }

      const range = `${inbox.lastUid + 1}:*`;
      let maxUid = inbox.lastUid;

      for await (const message of client.fetch(range, { uid: true, source: true }, { uid: true })) {
        if (!message.source || message.uid <= inbox.lastUid) continue;

        try {
          const parsed = await simpleParser(message.source);
          const email = toParsedInboundEmail(parsed);
          if (email) await processInboundEmail(inbox, email);
          maxUid = Math.max(maxUid, message.uid);
        } catch (error) {
          console.error(`Failed to process inbound email (inbox "${inbox.name}", uid ${message.uid})`, error);
          break;
        }
      }

      if (maxUid > inbox.lastUid) await inboxRepo.updateLastUid(inbox.id, maxUid);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }
}

function toParsedInboundEmail(parsed: Awaited<ReturnType<typeof simpleParser>>): ParsedInboundEmail | null {
  const messageId = parsed.messageId;
  const fromAddress = parsed.from?.value[0]?.address;
  if (!messageId || !fromAddress) return null;

  return {
    messageId,
    inReplyTo: parsed.inReplyTo,
    references: Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : [],
    subject: parsed.subject,
    text: parsed.text,
    html: parsed.html || undefined,
    fromAddress,
    fromName: parsed.from?.value[0]?.name,
  };
}

export async function pollAllSupportInboxes(): Promise<void> {
  const inboxes = await inboxRepo.findAllEnabledWithSecret();
  for (const inbox of inboxes) {
    try {
      await pollInbox(inbox);
    } catch (error) {
      console.error(`Failed to poll support inbox "${inbox.name}"`, error);
    }
  }
}

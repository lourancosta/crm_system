import { randomUUID } from 'crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client';
import { contactLite as contact, ticketLite as ticket } from '../../db/lightTables';
import { dynamicAssociation, processedInboundEmail, pipeline, pipelineStage } from '../../db/schema';

const OBJECT_TYPE = {
  ticket: 'tickets',
  contact: 'contacts',
} as const;

export async function hasProcessedMessage(supportInboxId: string, messageId: string): Promise<boolean> {
  const rows = await db
    .select({ id: processedInboundEmail.id })
    .from(processedInboundEmail)
    .where(
      and(eq(processedInboundEmail.supportInboxId, supportInboxId), eq(processedInboundEmail.messageId, messageId)),
    )
    .limit(1);
  return rows.length > 0;
}

export async function findTicketIdForThread(
  supportInboxId: string,
  candidateMessageIds: string[],
): Promise<string | null> {
  if (candidateMessageIds.length === 0) return null;
  const rows = await db
    .select({ ticketId: processedInboundEmail.ticketId })
    .from(processedInboundEmail)
    .where(
      and(
        eq(processedInboundEmail.supportInboxId, supportInboxId),
        inArray(processedInboundEmail.messageId, candidateMessageIds),
      ),
    )
    .limit(1);
  return rows[0]?.ticketId ?? null;
}

export async function recordProcessedEmail(
  supportInboxId: string,
  messageId: string,
  ticketId: string,
): Promise<void> {
  await db
    .insert(processedInboundEmail)
    .ignore()
    .values({ supportInboxId, messageId, ticketId });
}

// Which support inbox a ticket's email thread belongs to — every ticket
// created from (or replied to via) inbound email has at least one row here.
export async function findSupportInboxIdForTicket(ticketId: string): Promise<string | null> {
  const rows = await db
    .select({ supportInboxId: processedInboundEmail.supportInboxId })
    .from(processedInboundEmail)
    .where(eq(processedInboundEmail.ticketId, ticketId))
    .limit(1);
  return rows[0]?.supportInboxId ?? null;
}

// The most recent Message-ID seen in a ticket's thread (inbound or one of
// our own prior replies) — what a new reply's In-Reply-To/References should
// chain onto.
export async function findLatestMessageIdForTicket(ticketId: string): Promise<string | null> {
  const rows = await db
    .select({ messageId: processedInboundEmail.messageId })
    .from(processedInboundEmail)
    .where(eq(processedInboundEmail.ticketId, ticketId))
    .orderBy(desc(processedInboundEmail.processedAt))
    .limit(1);
  return rows[0]?.messageId ?? null;
}

export async function findPipelineStageNames(
  pipelineId: string,
  defaultStageId: string,
): Promise<{ pipelineName: string; stageName: string } | null> {
  const [pipelineRow] = await db.select().from(pipeline).where(eq(pipeline.id, pipelineId)).limit(1);
  const [stageRow] = await db.select().from(pipelineStage).where(eq(pipelineStage.id, defaultStageId)).limit(1);
  if (!pipelineRow || !stageRow) return null;
  return { pipelineName: pipelineRow.internalName, stageName: stageRow.internalName };
}

export async function findContactByEmail(email: string): Promise<{ id: string; hubspotId: string | null } | null> {
  const rows = await db
    .select({ id: contact.id, hubspotId: contact.hubspotId })
    .from(contact)
    .where(and(eq(contact.email, email), eq(contact.archived, false)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createContact(input: {
  email: string;
  firstname: string;
  lastname: string | null;
}): Promise<{ id: string; hubspotId: string }> {
  const id = randomUUID();
  const hubspotId = `local-${id}`;
  await db.insert(contact).values({
    id,
    hubspotId,
    firstname: input.firstname,
    lastname: input.lastname,
    email: input.email,
    archived: false,
  });
  return { id, hubspotId };
}

export async function createTicketFromEmail(input: {
  subject: string;
  content: string;
  hsPipeline: string;
  hsPipelineStage: string;
  contactHubspotId: string | null;
}): Promise<{ id: string }> {
  const id = randomUUID();
  const hubspotId = `local-${id}`;

  await db.insert(ticket).values({
    id,
    hubspotId,
    subject: input.subject,
    content: input.content,
    hsPipeline: input.hsPipeline,
    hsPipelineStage: input.hsPipelineStage,
    archived: false,
  });

  if (input.contactHubspotId) {
    await db.insert(dynamicAssociation).values([
      {
        fromObjectType: OBJECT_TYPE.ticket,
        fromHubspotId: hubspotId,
        toObjectType: OBJECT_TYPE.contact,
        toHubspotId: input.contactHubspotId,
        associationLabel: 'ticket_to_contact',
      },
      {
        fromObjectType: OBJECT_TYPE.contact,
        fromHubspotId: input.contactHubspotId,
        toObjectType: OBJECT_TYPE.ticket,
        toHubspotId: hubspotId,
        associationLabel: 'contact_to_ticket',
      },
    ]);
  }

  return { id };
}

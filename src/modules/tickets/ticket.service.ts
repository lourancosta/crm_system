import { logHistoryEvent } from '../history/history.service';
import * as ticketRepository from './ticket.repository';
import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { CreateTicketInput, UpdateTicketInput } from './ticket.types';

function notFound() {
  const error = new Error('Ticket not found') as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

export async function getTickets(page: number, limit: number, search: string | undefined, pipeline: string | undefined, scope?: RecordAccessScope) {
  return ticketRepository.findAll(page, limit, search, pipeline, scope);
}

export async function getTicketsForBoard(search?: string, scope?: RecordAccessScope) {
  return ticketRepository.findAllForBoard(search, scope);
}

export async function getTicketById(id: string, scope?: RecordAccessScope) {
  const t = await ticketRepository.findById(id, scope);
  if (!t) throw notFound();
  return t;
}

export async function createTicket(input: CreateTicketInput, userId?: string, createdByUserId?: string, companyHubspotId?: string | null) {
  const ticket = await ticketRepository.create(input, createdByUserId);
  if (createdByUserId && companyHubspotId && ticket.hubspotId) {
    await ticketRepository.associateWithCompany(ticket.hubspotId, companyHubspotId);
  }
  await logHistoryEvent({ objectType: 'tickets', objectId: ticket.id, title: 'Ticket created', userId });
  return ticket;
}

export async function updateTicketStage(id: string, stage: string, userId?: string, scope?: RecordAccessScope) {
  const ticket = await ticketRepository.updateStage(id, stage, scope);
  if (!ticket) throw notFound();
  await logHistoryEvent({ objectType: 'tickets', objectId: ticket.id, title: 'Ticket stage updated', userId });
  return ticket;
}

export async function updateTicket(id: string, input: UpdateTicketInput, scope?: RecordAccessScope) {
  const updated = await ticketRepository.update(id, input, scope);
  if (!updated) throw notFound();
  return updated;
}

export async function deleteTicket(id: string, scope?: RecordAccessScope) {
  const deleted = await ticketRepository.remove(id, scope);
  if (!deleted) throw notFound();
}

export const getTicketContacts = (id: string) => ticketRepository.findAssociatedContacts(id);

export const getTicketCompanies = (id: string) => ticketRepository.findAssociatedCompanies(id);

export const getTicketDeals = (id: string) => ticketRepository.findAssociatedDeals(id);

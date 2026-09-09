import { logHistoryEvent } from '../history/history.service';
import * as contactRepository from './contact.repository';
import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { CreateContactDTO, UpdateContactDTO } from './contact.types';

export async function getContacts(page: number, limit: number, search?: string, scope?: RecordAccessScope, companyId?: string) {
  return contactRepository.findAll(page, limit, search, scope, companyId);
}

export async function getContactById(id: string, scope?: RecordAccessScope) {
  const contact = await contactRepository.findById(id, scope);
  if (!contact) {
    const error = new Error('Contact not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }
  return contact;
}

export async function createContact(data: CreateContactDTO, userId?: string) {
  const contact = await contactRepository.create(data);
  await logHistoryEvent({ objectType: 'contacts', objectId: contact.id, title: 'Contact created', userId });
  return contact;
}

export async function updateContact(id: string, data: UpdateContactDTO, userId?: string, scope?: RecordAccessScope) {
  const contact = await contactRepository.update(id, data, scope);
  if (!contact) {
    const error = new Error('Contact not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }
  await logHistoryEvent({ objectType: 'contacts', objectId: contact.id, title: 'Contact updated', userId });
  return contact;
}

export async function deleteContact(id: string, scope?: RecordAccessScope) {
  const deleted = await contactRepository.remove(id, scope);
  if (!deleted) {
    const error = new Error('Contact not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }
}

export const getContactCompanies = (id: string) => contactRepository.findAssociatedCompanies(id);

export const getContactDeals = (id: string) => contactRepository.findAssociatedDeals(id);

export const getContactPartnerships = (id: string) => contactRepository.findAssociatedPartnerships(id);

export const getContactTickets = (id: string) => contactRepository.findAssociatedTickets(id);

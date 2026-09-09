import { logHistoryEvent } from '../history/history.service';
import * as partnershipRepository from './partnership.repository';
import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { CreatePartnershipInput, UpdatePartnershipInput } from './partnership.types';

function notFound() {
  const error = new Error('Partnership not found') as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

export async function getPartnerships(page: number, limit: number, search: string | undefined, pipeline: string | undefined, scope?: RecordAccessScope) {
  return partnershipRepository.findAll(page, limit, search, pipeline, scope);
}

export async function getPartnershipsForBoard(search?: string, scope?: RecordAccessScope) {
  return partnershipRepository.findAllForBoard(search, scope);
}

export async function getPartnershipCompanies(id: string) {
  return partnershipRepository.findAssociatedCompanies(id);
}

export async function getPartnershipContacts(id: string) {
  return partnershipRepository.findAssociatedContacts(id);
}

export async function getPartnershipById(id: string, scope?: RecordAccessScope) {
  const p = await partnershipRepository.findById(id, scope);
  if (!p) throw notFound();
  return p;
}

export async function createPartnership(input: CreatePartnershipInput, userId?: string) {
  const partnership = await partnershipRepository.create(input);
  await logHistoryEvent({ objectType: 'partnerships', objectId: partnership.id, title: 'Partnership created', userId });
  return partnership;
}

export async function updatePartnershipStage(id: string, stage: string, userId?: string, scope?: RecordAccessScope) {
  const partnership = await partnershipRepository.updateStage(id, stage, scope);
  if (!partnership) throw notFound();
  await logHistoryEvent({ objectType: 'partnerships', objectId: partnership.id, title: 'Partnership stage updated', userId });
  return partnership;
}

export async function updatePartnership(id: string, input: UpdatePartnershipInput, scope?: RecordAccessScope) {
  const updated = await partnershipRepository.update(id, input, scope);
  if (!updated) throw notFound();
  return updated;
}

export async function deletePartnership(id: string, scope?: RecordAccessScope) {
  const deleted = await partnershipRepository.remove(id, scope);
  if (!deleted) throw notFound();
}

import { logHistoryEvent } from '../history/history.service';
import * as dealRepository from './deal.repository';
import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { CreateDealInput, UpdateDealInput } from './deal.types';

function notFound(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

export async function getDeals(page: number, limit: number, search: string | undefined, pipeline: string | undefined, scope?: RecordAccessScope) {
  return dealRepository.findAll(page, limit, search, pipeline, scope);
}

export async function getDealsForBoard(search?: string, scope?: RecordAccessScope) {
  return dealRepository.findAllForBoard(search, scope);
}

export async function getDealById(id: string, scope?: RecordAccessScope) {
  const d = await dealRepository.findById(id, scope);
  if (!d) throw notFound('Deal not found');
  return d;
}

export async function createDeal(input: CreateDealInput, userId?: string, createdByUserId?: string, companyHubspotId?: string | null) {
  const deal = await dealRepository.create(input, createdByUserId);
  if (createdByUserId && companyHubspotId && deal.hubspotId) {
    await dealRepository.associateWithCompany(deal.hubspotId, companyHubspotId);
  }
  await logHistoryEvent({ objectType: 'deals', objectId: deal.id, title: 'Deal created', userId });
  return deal;
}

export async function updateDealStage(id: string, stage: string, userId?: string, scope?: RecordAccessScope) {
  const deal = await dealRepository.updateStage(id, stage, scope);
  if (!deal) throw notFound('Deal not found');
  await logHistoryEvent({ objectType: 'deals', objectId: deal.id, title: 'Deal stage updated', userId });
  return deal;
}

export async function updateDeal(id: string, input: UpdateDealInput, scope?: RecordAccessScope) {
  const updated = await dealRepository.update(id, input, scope);
  if (!updated) throw notFound('Deal not found');
  return updated;
}

export async function deleteDeal(id: string, scope?: RecordAccessScope) {
  const deleted = await dealRepository.remove(id, scope);
  if (!deleted) throw notFound('Deal not found');
}

export const getDealCompanies = (id: string) => dealRepository.findAssociatedCompanies(id);
export const getDealContacts = (id: string) => dealRepository.findAssociatedContacts(id);
export const getDealQuotes = (id: string) => dealRepository.findAssociatedQuotes(id);
export const getDealInvoices = (id: string) => dealRepository.findAssociatedInvoices(id);

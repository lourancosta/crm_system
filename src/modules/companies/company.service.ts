import { logHistoryEvent } from '../history/history.service';
import * as companyRepository from './company.repository';
import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { CreateCompanyInput, UpdateCompanyInput } from './company.types';

function notFound(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

export async function getCompanies(page: number, limit: number, search?: string, scope?: RecordAccessScope, type?: string) {
  return companyRepository.findAll(page, limit, search, scope, type);
}

export async function getCompanyById(id: string, scope?: RecordAccessScope) {
  const c = await companyRepository.findById(id, scope);
  if (!c) throw notFound('Company not found');
  return c;
}

export async function createCompany(input: CreateCompanyInput, userId?: string) {
  const company = await companyRepository.create(input);
  await logHistoryEvent({ objectType: 'companies', objectId: company.id, title: 'Company created', userId });
  return company;
}

export async function updateCompany(id: string, input: UpdateCompanyInput, scope?: RecordAccessScope) {
  const updated = await companyRepository.update(id, input, scope);
  if (!updated) throw notFound('Company not found');
  if (input.lifecyclestage !== undefined) {
    await companyRepository.syncContactsLifecycleStage(id, input.lifecyclestage ?? null);
  }
  return updated;
}

export async function deleteCompany(id: string, scope?: RecordAccessScope) {
  const deleted = await companyRepository.remove(id, scope);
  if (!deleted) throw notFound('Company not found');
}

export const getCompanyCompanies = (id: string) => companyRepository.findAssociatedCompanies(id);

export const getCompanyContacts = (id: string) => companyRepository.findAssociatedContacts(id);

export const getCompanyDeals = (id: string) => companyRepository.findAssociatedDeals(id);

export const getCompanyTickets = (id: string) => companyRepository.findAssociatedTickets(id);

export const getCompanyLicenses = (id: string) => companyRepository.findAssociatedLicenses(id);

export const getCompanyInvoices = (id: string) => companyRepository.findAssociatedInvoices(id);

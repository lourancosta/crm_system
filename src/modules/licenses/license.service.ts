import * as licenseRepository from './license.repository';
import type { RecordAccessScope } from '../../lib/scopeFilter';
import type { CreateLicenseInput, UpdateLicenseInput } from './license.types';

function notFound() {
  const error = new Error('License not found') as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

export async function getLicenses(
  page: number,
  limit: number,
  search?: string,
  status?: string,
  subscription?: string,
  scope?: RecordAccessScope,
) {
  return licenseRepository.findAll(page, limit, search, status, subscription, scope);
}

export async function getLicenseById(id: string, scope?: RecordAccessScope) {
  const l = await licenseRepository.findById(id, scope);
  if (!l) throw notFound();
  return l;
}

export async function createLicense(input: CreateLicenseInput) {
  return licenseRepository.create(input);
}

export async function updateLicense(id: string, input: UpdateLicenseInput, scope?: RecordAccessScope) {
  const updated = await licenseRepository.update(id, input, scope);
  if (!updated) throw notFound();
  return updated;
}

export async function deleteLicense(id: string, scope?: RecordAccessScope) {
  const deleted = await licenseRepository.remove(id, scope);
  if (!deleted) throw notFound();
}

export const getLicenseCompanies = (id: string) => licenseRepository.findAssociatedCompanies(id);

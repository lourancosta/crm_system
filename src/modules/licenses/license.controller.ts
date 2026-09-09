import type { Request, Response, NextFunction } from 'express';
import * as licenseService from './license.service';
import { resolveAccessScope } from '../../lib/scopeFilter';
import { createLicenseSchema, licenseIdParamsSchema, listLicensesQuerySchema, updateLicenseSchema } from './license.schema';

function scopeFor(req: Request, action: 'view' | 'edit' | 'delete') {
  return resolveAccessScope({
    accountType: req.user!.accountType,
    companyId: req.user!.companyId,
    grant: req.scope!,
    ownerKey: req.scope!.ownerKey,
    action,
  });
}

export async function listLicenses(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, status, subscription } = listLicensesQuerySchema.parse(req.query);
    const scope = await scopeFor(req, 'view');
    const result = await licenseService.getLicenses(page, limit, search, status, subscription, scope);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getLicense(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = licenseIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const l = await licenseService.getLicenseById(id, scope);
    res.json(l);
  } catch (error) {
    next(error);
  }
}

export async function createLicense(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createLicenseSchema.parse(req.body);
    const l = await licenseService.createLicense(input);
    res.status(201).json(l);
  } catch (error) {
    next(error);
  }
}

export async function updateLicense(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = licenseIdParamsSchema.parse(req.params);
    const input = updateLicenseSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const l = await licenseService.updateLicense(id, input, scope);
    res.json(l);
  } catch (error) {
    next(error);
  }
}

export async function deleteLicense(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = licenseIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await licenseService.deleteLicense(id, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listLicenseCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = licenseIdParamsSchema.parse(req.params);
    const data = await licenseService.getLicenseCompanies(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

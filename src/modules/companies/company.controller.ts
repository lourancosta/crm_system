import type { Request, Response, NextFunction } from 'express';
import * as companyService from './company.service';
import { resolveAccessScope } from '../../lib/scopeFilter';
import {
  companyIdParamsSchema,
  createCompanySchema,
  listCompaniesQuerySchema,
  updateCompanySchema,
} from './company.schema';

function scopeFor(req: Request, action: 'view' | 'edit' | 'delete') {
  return resolveAccessScope({
    accountType: req.user!.accountType,
    companyId: req.user!.companyId,
    grant: req.scope!,
    ownerKey: req.scope!.ownerKey,
    action,
  });
}

export async function listCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, type } = listCompaniesQuerySchema.parse(req.query);
    const scope = await scopeFor(req, 'view');
    const result = await companyService.getCompanies(page, limit, search, scope, type);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = companyIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const c = await companyService.getCompanyById(id, scope);
    res.json(c);
  } catch (error) {
    next(error);
  }
}

export async function createCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCompanySchema.parse(req.body);
    const c = await companyService.createCompany(input, req.user?.userId);
    res.status(201).json(c);
  } catch (error) {
    next(error);
  }
}

export async function updateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = companyIdParamsSchema.parse(req.params);
    const input = updateCompanySchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const c = await companyService.updateCompany(id, input, scope);
    res.json(c);
  } catch (error) {
    next(error);
  }
}

export async function deleteCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = companyIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await companyService.deleteCompany(id, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listCompanyCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = companyIdParamsSchema.parse(req.params);
    const data = await companyService.getCompanyCompanies(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listCompanyContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = companyIdParamsSchema.parse(req.params);
    const data = await companyService.getCompanyContacts(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listCompanyDeals(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = companyIdParamsSchema.parse(req.params);
    const data = await companyService.getCompanyDeals(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listCompanyTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = companyIdParamsSchema.parse(req.params);
    const data = await companyService.getCompanyTickets(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listCompanyLicenses(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = companyIdParamsSchema.parse(req.params);
    const data = await companyService.getCompanyLicenses(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listCompanyInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = companyIdParamsSchema.parse(req.params);
    const data = await companyService.getCompanyInvoices(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

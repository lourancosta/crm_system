import type { Request, Response, NextFunction } from 'express';
import * as dealService from './deal.service';
import { resolveAccessScope, resolveCompanyHubspotId } from '../../lib/scopeFilter';
import {
  createDealSchema,
  dealIdParamsSchema,
  listDealsQuerySchema,
  updateDealSchema,
  updateDealStageSchema,
} from './deal.schema';

function scopeFor(req: Request, action: 'view' | 'edit' | 'delete') {
  return resolveAccessScope({
    accountType: req.user!.accountType,
    companyId: req.user!.companyId,
    grant: req.scope!,
    ownerKey: req.scope!.ownerKey,
    action,
  });
}

export async function listDeals(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, pipeline } = listDealsQuerySchema.parse(req.query);
    const scope = await scopeFor(req, 'view');
    const result = await dealService.getDeals(page, limit, search, pipeline, scope);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDealsForBoard(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const scope = await scopeFor(req, 'view');
    const data = await dealService.getDealsForBoard(search, scope);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getDeal(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = dealIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const d = await dealService.getDealById(id, scope);
    res.json(d);
  } catch (error) {
    next(error);
  }
}

export async function createDeal(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createDealSchema.parse(req.body);
    const isPortal = req.user!.accountType !== 'internal';
    const companyHubspotId = isPortal ? await resolveCompanyHubspotId(req.user!.companyId) : null;
    const d = await dealService.createDeal(input, req.user?.userId, isPortal ? req.user!.userId : undefined, companyHubspotId);
    res.status(201).json(d);
  } catch (error) {
    next(error);
  }
}

export async function updateDealStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = dealIdParamsSchema.parse(req.params);
    const { stage } = updateDealStageSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const d = await dealService.updateDealStage(id, stage, req.user?.userId, scope);
    res.json(d);
  } catch (error) {
    next(error);
  }
}

export async function updateDeal(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = dealIdParamsSchema.parse(req.params);
    const input = updateDealSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const d = await dealService.updateDeal(id, input, scope);
    res.json(d);
  } catch (error) {
    next(error);
  }
}

export async function deleteDeal(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = dealIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await dealService.deleteDeal(id, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listDealCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = dealIdParamsSchema.parse(req.params);
    const data = await dealService.getDealCompanies(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listDealContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = dealIdParamsSchema.parse(req.params);
    const data = await dealService.getDealContacts(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listDealQuotes(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = dealIdParamsSchema.parse(req.params);
    const data = await dealService.getDealQuotes(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listDealInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = dealIdParamsSchema.parse(req.params);
    const data = await dealService.getDealInvoices(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

import type { Request, Response, NextFunction } from 'express';
import * as partnershipService from './partnership.service';
import { resolveAccessScope } from '../../lib/scopeFilter';
import {
  createPartnershipSchema,
  listPartnershipsQuerySchema,
  partnershipIdParamsSchema,
  updatePartnershipSchema,
  updatePartnershipStageSchema,
} from './partnership.schema';

function scopeFor(req: Request, action: 'view' | 'edit' | 'delete') {
  return resolveAccessScope({
    accountType: req.user!.accountType,
    companyId: req.user!.companyId,
    grant: req.scope!,
    ownerKey: req.scope!.ownerKey,
    action,
  });
}

export async function listPartnerships(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, pipeline } = listPartnershipsQuerySchema.parse(req.query);
    const scope = await scopeFor(req, 'view');
    const result = await partnershipService.getPartnerships(page, limit, search, pipeline, scope);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPartnershipsForBoard(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const scope = await scopeFor(req, 'view');
    const data = await partnershipService.getPartnershipsForBoard(search, scope);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getPartnership(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = partnershipIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const p = await partnershipService.getPartnershipById(id, scope);
    res.json(p);
  } catch (error) {
    next(error);
  }
}

export async function listPartnershipCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = partnershipIdParamsSchema.parse(req.params);
    const data = await partnershipService.getPartnershipCompanies(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listPartnershipContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = partnershipIdParamsSchema.parse(req.params);
    const data = await partnershipService.getPartnershipContacts(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function createPartnership(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPartnershipSchema.parse(req.body);
    const p = await partnershipService.createPartnership(input, req.user?.userId);
    res.status(201).json(p);
  } catch (error) {
    next(error);
  }
}

export async function updatePartnershipStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = partnershipIdParamsSchema.parse(req.params);
    const { stage } = updatePartnershipStageSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const p = await partnershipService.updatePartnershipStage(id, stage, req.user?.userId, scope);
    res.json(p);
  } catch (error) {
    next(error);
  }
}

export async function updatePartnership(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = partnershipIdParamsSchema.parse(req.params);
    const input = updatePartnershipSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const p = await partnershipService.updatePartnership(id, input, scope);
    res.json(p);
  } catch (error) {
    next(error);
  }
}

export async function deletePartnership(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = partnershipIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await partnershipService.deletePartnership(id, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

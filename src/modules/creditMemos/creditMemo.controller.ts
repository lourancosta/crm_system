import type { NextFunction, Request, Response } from 'express';
import * as service from './creditMemo.service';
import { resolveAccessScope } from '../../lib/scopeFilter';
import {
  createCreditMemoSchema,
  creditMemoIdParamsSchema,
  listAvailableCreditMemosQuerySchema,
  listCreditMemosQuerySchema,
  updateCreditMemoSchema,
} from './creditMemo.schema';

function scopeFor(req: Request, action: 'view' | 'edit' | 'delete') {
  return resolveAccessScope({
    accountType: req.user!.accountType,
    companyId: req.user!.companyId,
    grant: req.scope!,
    ownerKey: req.scope!.ownerKey,
    action,
  });
}

export async function listCreditMemos(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, status } = listCreditMemosQuerySchema.parse(req.query);
    const scope = await scopeFor(req, 'view');
    const result = await service.listCreditMemos(page, limit, search, status, scope);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCreditMemo(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = creditMemoIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const cm = await service.getCreditMemoById(id, scope);
    res.json(cm);
  } catch (error) {
    next(error);
  }
}

export async function listAvailableCreditMemos(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, excludeInvoiceId } = listAvailableCreditMemosQuerySchema.parse(req.query);
    const data = await service.getAvailableCreditMemosForCompany(companyId, excludeInvoiceId);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function createCreditMemo(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCreditMemoSchema.parse(req.body);
    const cm = await service.createCreditMemo(input, req.user?.userId);
    res.status(201).json(cm);
  } catch (error) {
    next(error);
  }
}

export async function updateCreditMemo(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = creditMemoIdParamsSchema.parse(req.params);
    const input = updateCreditMemoSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const cm = await service.updateCreditMemo(id, input, scope);
    res.json(cm);
  } catch (error) {
    next(error);
  }
}

export async function deleteCreditMemo(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = creditMemoIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await service.deleteCreditMemo(id, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function voidCreditMemo(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = creditMemoIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'edit');
    const cm = await service.voidCreditMemo(id, scope);
    res.json(cm);
  } catch (error) {
    next(error);
  }
}

export async function listCreditMemoInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = creditMemoIdParamsSchema.parse(req.params);
    const data = await service.getCreditMemoInvoices(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listCreditMemoCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = creditMemoIdParamsSchema.parse(req.params);
    const data = await service.getCreditMemoCompanies(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listCreditMemoContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = creditMemoIdParamsSchema.parse(req.params);
    const data = await service.getCreditMemoContacts(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

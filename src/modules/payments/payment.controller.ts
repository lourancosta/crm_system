import type { NextFunction, Request, Response } from 'express';
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  paymentIdParamsSchema,
  updatePaymentSchema,
} from './payment.schema';
import * as service from './payment.service';
import { resolveAccessScope } from '../../lib/scopeFilter';

function scopeFor(req: Request, action: 'view' | 'edit' | 'delete') {
  return resolveAccessScope({
    accountType: req.user!.accountType,
    companyId: req.user!.companyId,
    grant: req.scope!,
    ownerKey: req.scope!.ownerKey,
    action,
  });
}

export async function listPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search } = listPaymentsQuerySchema.parse(req.query);
    const scope = await scopeFor(req, 'view');
    const result = await service.listPayments(page, limit, search || undefined, scope);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = paymentIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const p = await service.getPaymentById(id, scope);
    res.json(p);
  } catch (err) {
    next(err);
  }
}

export async function createPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPaymentSchema.parse(req.body);
    const p = await service.createPayment(input, req.user?.userId);
    res.status(201).json(p);
  } catch (err) {
    next(err);
  }
}

export async function updatePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = paymentIdParamsSchema.parse(req.params);
    const input = updatePaymentSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const p = await service.updatePayment(id, input, scope);
    res.json(p);
  } catch (err) {
    next(err);
  }
}

export async function deletePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = paymentIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await service.deletePayment(id, scope);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listPaymentInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = paymentIdParamsSchema.parse(req.params);
    const data = await service.getPaymentInvoices(id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function listPaymentCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = paymentIdParamsSchema.parse(req.params);
    const data = await service.getPaymentCompanies(id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

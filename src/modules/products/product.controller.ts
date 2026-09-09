import type { NextFunction, Request, Response } from 'express';
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamsSchema,
  updateProductSchema,
} from './product.schema';
import * as service from './product.service';
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

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, type } = listProductsQuerySchema.parse(req.query);
    const scope = await scopeFor(req, 'view');
    const result = await service.listProducts(page, limit, search || undefined, scope, type);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = productIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const p = await service.getProductById(id, scope);
    res.json(p);
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProductSchema.parse(req.body);
    const p = await service.createProduct(input);
    res.status(201).json(p);
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = productIdParamsSchema.parse(req.params);
    const input = updateProductSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const p = await service.updateProduct(id, input, scope);
    res.json(p);
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = productIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await service.deleteProduct(id, scope);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

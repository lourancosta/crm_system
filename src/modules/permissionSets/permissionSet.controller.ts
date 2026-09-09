import type { NextFunction, Request, Response } from 'express';
import * as service from './permissionSet.service';
import { createPermissionSetSchema, permissionSetIdParamsSchema, updatePermissionSetSchema } from './permissionSet.schema';

export async function listPermissionSets(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listPermissionSets());
  } catch (error) {
    next(error);
  }
}

export async function getPermissionSet(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = permissionSetIdParamsSchema.parse(req.params);
    res.json(await service.getPermissionSet(id));
  } catch (error) {
    next(error);
  }
}

export async function createPermissionSet(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPermissionSetSchema.parse(req.body);
    res.status(201).json(await service.createPermissionSet(input));
  } catch (error) {
    next(error);
  }
}

export async function updatePermissionSet(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = permissionSetIdParamsSchema.parse(req.params);
    const input = updatePermissionSetSchema.parse(req.body);
    res.json(await service.updatePermissionSet(id, input));
  } catch (error) {
    next(error);
  }
}

export async function deletePermissionSet(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = permissionSetIdParamsSchema.parse(req.params);
    await service.deletePermissionSet(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

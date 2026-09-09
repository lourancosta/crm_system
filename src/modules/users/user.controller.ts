import type { NextFunction, Request, Response } from 'express';
import { createUserSchema, listUsersQuerySchema, updateUserSchema, userIdParamsSchema } from './user.schema';
import * as service from './user.service';
import type { CallerContext } from './user.types';

function callerFrom(req: Request): CallerContext {
  return { accountType: req.user!.accountType, companyId: req.user!.companyId };
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search } = listUsersQuerySchema.parse(req.query);
    const result = await service.listUsers({ page, limit, search }, callerFrom(req));
    res.json({ ...result, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function listInternalUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listInternalUsers());
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = userIdParamsSchema.parse(req.params);
    const user = await service.getUserById(id, callerFrom(req));
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await service.createUser(data, callerFrom(req));
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = userIdParamsSchema.parse(req.params);
    const data = updateUserSchema.parse(req.body);
    const user = await service.updateUser(id, data, callerFrom(req));
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = userIdParamsSchema.parse(req.params);
    await service.deleteUser(id, callerFrom(req));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function resendInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = userIdParamsSchema.parse(req.params);
    const result = await service.resendInvite(id, callerFrom(req));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

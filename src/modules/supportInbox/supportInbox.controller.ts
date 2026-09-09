import type { NextFunction, Request, Response } from 'express';
import * as service from './supportInbox.service';
import { createSupportInboxSchema, supportInboxIdParamsSchema, updateSupportInboxSchema } from './supportInbox.schema';

export async function listInboxes(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listInboxes());
  } catch (error) {
    next(error);
  }
}

export async function createInbox(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSupportInboxSchema.parse(req.body);
    res.status(201).json(await service.createInbox(input));
  } catch (error) {
    next(error);
  }
}

export async function updateInbox(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = supportInboxIdParamsSchema.parse(req.params);
    const input = updateSupportInboxSchema.parse(req.body);
    res.json(await service.updateInbox(id, input));
  } catch (error) {
    next(error);
  }
}

export async function deleteInbox(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = supportInboxIdParamsSchema.parse(req.params);
    await service.deleteInbox(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

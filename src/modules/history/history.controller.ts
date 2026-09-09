import type { NextFunction, Request, Response } from 'express';
import {
  createActivitySchema,
  historyEntryParamsSchema,
  historyParamsSchema,
  historyQuerySchema,
  logActivityParamsSchema,
  updateActivitySchema,
} from './history.schema';
import * as service from './history.service';

export async function listHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType, objectId } = historyParamsSchema.parse(req.params);
    const { cursor, limit, types } = historyQuerySchema.parse(req.query);
    const data = await service.listForRecord(objectType, objectId, { cursor, limit, types });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function createActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType, objectId } = logActivityParamsSchema.parse(req.params);
    const data = createActivitySchema.parse(req.body);
    await service.createActivity(objectType, objectId, data, req.user?.userId);
    res.status(201).send();
  } catch (error) {
    next(error);
  }
}

export async function updateActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = historyEntryParamsSchema.parse(req.params);
    const data = updateActivitySchema.parse(req.body);
    await service.updateActivity(id, data);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function deleteActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = historyEntryParamsSchema.parse(req.params);
    await service.deleteActivity(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getActivityAssociations(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = historyEntryParamsSchema.parse(req.params);
    const data = await service.getActivityAssociations(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

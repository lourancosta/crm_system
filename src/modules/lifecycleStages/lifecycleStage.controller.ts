import type { NextFunction, Request, Response } from 'express';
import * as service from './lifecycleStage.service';
import {
  createLifecycleStageSchema,
  lifecycleObjectTypeQuerySchema,
  lifecycleStageIdParamsSchema,
  reorderLifecycleStagesSchema,
  updateLifecycleStageSchema,
} from './lifecycleStage.schema';

export async function listStages(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType } = lifecycleObjectTypeQuerySchema.parse(req.query);
    res.json(await service.listStages(objectType));
  } catch (error) {
    next(error);
  }
}

export async function getDetectedValues(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType } = lifecycleObjectTypeQuerySchema.parse(req.query);
    res.json(await service.getDetectedValues(objectType));
  } catch (error) {
    next(error);
  }
}

export async function createStage(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createLifecycleStageSchema.parse(req.body);
    res.status(201).json(await service.createStage(input));
  } catch (error) {
    next(error);
  }
}

export async function updateStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = lifecycleStageIdParamsSchema.parse(req.params);
    const input = updateLifecycleStageSchema.parse(req.body);
    res.json(await service.updateStage(id, input));
  } catch (error) {
    next(error);
  }
}

export async function deleteStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = lifecycleStageIdParamsSchema.parse(req.params);
    await service.deleteStage(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function reorderStages(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType } = lifecycleObjectTypeQuerySchema.parse(req.query);
    const { stageIds } = reorderLifecycleStagesSchema.parse(req.body);
    await service.reorderStages(objectType, stageIds);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

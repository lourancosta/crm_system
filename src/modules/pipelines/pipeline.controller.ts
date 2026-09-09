import type { NextFunction, Request, Response } from 'express';
import * as service from './pipeline.service';
import {
  createPipelineSchema,
  createStageSchema,
  pipelineIdParamsSchema,
  pipelineObjectTypeQuerySchema,
  reorderStagesSchema,
  stageParamsSchema,
  updatePipelineSchema,
  updateStageSchema,
} from './pipeline.schema';

export async function listPipelines(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType } = pipelineObjectTypeQuerySchema.parse(req.query);
    const data = await service.listPipelines(objectType);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getDetectedPipelineValues(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType } = pipelineObjectTypeQuerySchema.parse(req.query);
    const data = await service.getDetectedPipelineValues(objectType);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getPipeline(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = pipelineIdParamsSchema.parse(req.params);
    const data = await service.getPipeline(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getDetectedStageValues(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = pipelineIdParamsSchema.parse(req.params);
    const data = await service.getDetectedStageValuesForPipeline(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function createPipeline(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPipelineSchema.parse(req.body);
    const data = await service.createPipeline(input);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
}

export async function updatePipeline(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = pipelineIdParamsSchema.parse(req.params);
    const input = updatePipelineSchema.parse(req.body);
    const data = await service.updatePipeline(id, input);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function deletePipeline(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = pipelineIdParamsSchema.parse(req.params);
    await service.deletePipeline(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function createStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = pipelineIdParamsSchema.parse(req.params);
    const input = createStageSchema.parse(req.body);
    const data = await service.createStage(id, input);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
}

export async function updateStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { stageId } = stageParamsSchema.parse(req.params);
    const input = updateStageSchema.parse(req.body);
    const data = await service.updateStage(stageId, input);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function deleteStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { stageId } = stageParamsSchema.parse(req.params);
    await service.deleteStage(stageId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function reorderStages(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = pipelineIdParamsSchema.parse(req.params);
    const { stageIds } = reorderStagesSchema.parse(req.body);
    await service.reorderStages(id, stageIds);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

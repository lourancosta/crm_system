import { Router } from 'express';
import {
  createStage,
  deleteStage,
  getDetectedValues,
  listStages,
  reorderStages,
  updateStage,
} from './lifecycleStage.controller';

export const lifecycleStageRoutes = Router();

lifecycleStageRoutes.get('/', listStages);
lifecycleStageRoutes.get('/detected-values', getDetectedValues);
lifecycleStageRoutes.post('/', createStage);
lifecycleStageRoutes.put('/reorder', reorderStages);
lifecycleStageRoutes.put('/:id', updateStage);
lifecycleStageRoutes.delete('/:id', deleteStage);

import { Router } from 'express';
import {
  createPipeline,
  createStage,
  deletePipeline,
  deleteStage,
  getDetectedPipelineValues,
  getDetectedStageValues,
  getPipeline,
  listPipelines,
  reorderStages,
  updatePipeline,
  updateStage,
} from './pipeline.controller';

export const pipelineRoutes = Router();

pipelineRoutes.get('/', listPipelines);
pipelineRoutes.get('/detected-pipelines', getDetectedPipelineValues);
pipelineRoutes.post('/', createPipeline);
pipelineRoutes.get('/:id', getPipeline);
pipelineRoutes.put('/:id', updatePipeline);
pipelineRoutes.delete('/:id', deletePipeline);
pipelineRoutes.get('/:id/detected-stages', getDetectedStageValues);
pipelineRoutes.post('/:id/stages', createStage);
pipelineRoutes.put('/:id/stages/reorder', reorderStages);
pipelineRoutes.put('/:id/stages/:stageId', updateStage);
pipelineRoutes.delete('/:id/stages/:stageId', deleteStage);

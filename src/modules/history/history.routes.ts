import { Router } from 'express';
import {
  createActivity,
  deleteActivity,
  getActivityAssociations,
  listHistory,
  updateActivity,
} from './history.controller';

export const historyRoutes = Router();

historyRoutes.get('/:objectType/:objectId', listHistory);
historyRoutes.post('/:objectType/:objectId', createActivity);
historyRoutes.get('/entry/:id/associations', getActivityAssociations);
historyRoutes.patch('/entry/:id', updateActivity);
historyRoutes.delete('/entry/:id', deleteActivity);

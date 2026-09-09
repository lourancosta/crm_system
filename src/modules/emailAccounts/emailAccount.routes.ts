import { Router } from 'express';
import {
  createAccount,
  deleteAccount,
  getFeatureAssignments,
  listAccounts,
  setFeatureAssignment,
  updateAccount,
} from './emailAccount.controller';

export const emailAccountRoutes = Router();

emailAccountRoutes.get('/', listAccounts);
emailAccountRoutes.post('/', createAccount);
emailAccountRoutes.get('/feature-settings', getFeatureAssignments);
emailAccountRoutes.put('/feature-settings/:feature', setFeatureAssignment);
emailAccountRoutes.put('/:id', updateAccount);
emailAccountRoutes.delete('/:id', deleteAccount);

import { Router } from 'express';
import {
  createPermissionSet,
  deletePermissionSet,
  getPermissionSet,
  listPermissionSets,
  updatePermissionSet,
} from './permissionSet.controller';

export const permissionSetRoutes = Router();

permissionSetRoutes.get('/', listPermissionSets);
permissionSetRoutes.post('/', createPermissionSet);
permissionSetRoutes.get('/:id', getPermissionSet);
permissionSetRoutes.put('/:id', updatePermissionSet);
permissionSetRoutes.delete('/:id', deletePermissionSet);

import { Router } from 'express';
import { getDefaults, updateDefaults } from './accountDefaults.controller';

export const accountDefaultsRoutes = Router();

accountDefaultsRoutes.get('/', getDefaults);
accountDefaultsRoutes.put('/', updateDefaults);

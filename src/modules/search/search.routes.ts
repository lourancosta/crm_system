import { Router } from 'express';
import { search } from './search.controller';

export const searchRoutes = Router();

searchRoutes.get('/', search);

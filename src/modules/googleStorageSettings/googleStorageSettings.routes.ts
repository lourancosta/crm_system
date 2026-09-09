import { Router } from 'express';
import { getSettings, updateSettings } from './googleStorageSettings.controller';

export const googleStorageSettingsRoutes = Router();

googleStorageSettingsRoutes.get('/', getSettings);
googleStorageSettingsRoutes.put('/', updateSettings);

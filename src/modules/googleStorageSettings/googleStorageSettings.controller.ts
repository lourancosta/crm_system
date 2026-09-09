import type { Request, Response, NextFunction } from 'express';
import { getGoogleStorageSettings, setGoogleStorageSettings } from './googleStorageSettings.repository';
import { updateGoogleStorageSettingsSchema } from './googleStorageSettings.schema';

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getGoogleStorageSettings());
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateGoogleStorageSettingsSchema.parse(req.body);
    res.json(await setGoogleStorageSettings(input));
  } catch (error) {
    next(error);
  }
}

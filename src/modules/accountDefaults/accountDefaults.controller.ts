import type { Request, Response, NextFunction } from 'express';
import { getAccountDefaults, setAccountDefaults } from './accountDefaults.repository';
import { updateAccountDefaultsSchema } from './accountDefaults.schema';

export async function getDefaults(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getAccountDefaults());
  } catch (error) {
    next(error);
  }
}

export async function updateDefaults(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateAccountDefaultsSchema.parse(req.body);
    res.json(await setAccountDefaults(input));
  } catch (error) {
    next(error);
  }
}

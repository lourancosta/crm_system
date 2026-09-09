import type { NextFunction, Request, Response } from 'express';
import * as service from './emailAccount.service';
import {
  createEmailAccountSchema,
  emailAccountIdParamsSchema,
  featureParamsSchema,
  setFeatureAssignmentSchema,
  updateEmailAccountSchema,
} from './emailAccount.schema';

export async function listAccounts(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listAccounts());
  } catch (error) {
    next(error);
  }
}

export async function createAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createEmailAccountSchema.parse(req.body);
    res.status(201).json(await service.createAccount(input));
  } catch (error) {
    next(error);
  }
}

export async function updateAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = emailAccountIdParamsSchema.parse(req.params);
    const input = updateEmailAccountSchema.parse(req.body);
    res.json(await service.updateAccount(id, input));
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = emailAccountIdParamsSchema.parse(req.params);
    await service.deleteAccount(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getFeatureAssignments(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getFeatureAssignments());
  } catch (error) {
    next(error);
  }
}

export async function setFeatureAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const { feature } = featureParamsSchema.parse(req.params);
    const { emailAccountId } = setFeatureAssignmentSchema.parse(req.body);
    await service.setFeatureAssignment(feature, emailAccountId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

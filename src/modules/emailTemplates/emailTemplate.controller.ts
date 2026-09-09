import type { NextFunction, Request, Response } from 'express';
import * as service from './emailTemplate.service';
import {
  createEmailTemplateSchema,
  emailTemplateIdParamsSchema,
  listEmailTemplatesQuerySchema,
  updateEmailTemplateSchema,
} from './emailTemplate.schema';

export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, object } = listEmailTemplatesQuerySchema.parse(req.query);
    res.json(await service.listTemplates(page, limit, search, object));
  } catch (error) {
    next(error);
  }
}

export async function getTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = emailTemplateIdParamsSchema.parse(req.params);
    res.json(await service.getTemplate(id));
  } catch (error) {
    next(error);
  }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createEmailTemplateSchema.parse(req.body);
    res.status(201).json(await service.createTemplate(input));
  } catch (error) {
    next(error);
  }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = emailTemplateIdParamsSchema.parse(req.params);
    const input = updateEmailTemplateSchema.parse(req.body);
    res.json(await service.updateTemplate(id, input));
  } catch (error) {
    next(error);
  }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = emailTemplateIdParamsSchema.parse(req.params);
    await service.deleteTemplate(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

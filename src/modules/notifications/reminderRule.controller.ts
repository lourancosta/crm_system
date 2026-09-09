import type { NextFunction, Request, Response } from 'express';
import {
  createReminderRuleSchema,
  listReminderRulesQuerySchema,
  reminderRuleIdParamsSchema,
  updateReminderRuleSchema,
} from './reminderRule.schema';
import * as service from './reminderRule.service';

export async function listReminderRules(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType } = listReminderRulesQuerySchema.parse(req.query);
    const rules = await service.listReminderRules(objectType);
    res.json(rules);
  } catch (err) {
    next(err);
  }
}

export async function getReminderRule(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = reminderRuleIdParamsSchema.parse(req.params);
    const rule = await service.getReminderRuleById(id);
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

export async function createReminderRule(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createReminderRuleSchema.parse(req.body);
    const rule = await service.createReminderRule(input);
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

export async function updateReminderRule(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = reminderRuleIdParamsSchema.parse(req.params);
    const input = updateReminderRuleSchema.parse(req.body);
    const rule = await service.updateReminderRule(id, input);
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

export async function deleteReminderRule(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = reminderRuleIdParamsSchema.parse(req.params);
    await service.deleteReminderRule(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

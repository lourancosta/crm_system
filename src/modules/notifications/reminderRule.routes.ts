import { Router } from 'express';
import {
  createReminderRule,
  deleteReminderRule,
  getReminderRule,
  listReminderRules,
  updateReminderRule,
} from './reminderRule.controller';

export const reminderRuleRoutes = Router();

reminderRuleRoutes.get('/', listReminderRules);
reminderRuleRoutes.post('/', createReminderRule);
reminderRuleRoutes.get('/:id', getReminderRule);
reminderRuleRoutes.put('/:id', updateReminderRule);
reminderRuleRoutes.delete('/:id', deleteReminderRule);

import { Router } from 'express';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from './emailTemplate.controller';

export const emailTemplateRoutes = Router();

emailTemplateRoutes.get('/', listTemplates);
emailTemplateRoutes.post('/', createTemplate);
emailTemplateRoutes.get('/:id', getTemplate);
emailTemplateRoutes.put('/:id', updateTemplate);
emailTemplateRoutes.delete('/:id', deleteTemplate);

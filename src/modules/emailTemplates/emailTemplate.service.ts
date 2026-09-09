import * as repo from './emailTemplate.repository';
import type { CreateEmailTemplateInput, EmailTemplateObject, UpdateEmailTemplateInput } from './emailTemplate.types';

function notFound() {
  const error = new Error('Email template not found') as Error & { statusCode?: number };
  error.statusCode = 404;
  return error;
}

export const listTemplates = (page: number, limit: number, search?: string, object?: EmailTemplateObject) =>
  repo.findAll(page, limit, search, object);

export async function getTemplate(id: string) {
  const template = await repo.findById(id);
  if (!template) throw notFound();
  return template;
}

export const createTemplate = (input: CreateEmailTemplateInput) => repo.create(input);

export async function updateTemplate(id: string, input: UpdateEmailTemplateInput) {
  const template = await repo.update(id, input);
  if (!template) throw notFound();
  return template;
}

export async function deleteTemplate(id: string) {
  const deleted = await repo.remove(id);
  if (!deleted) throw notFound();
}

import type { Request, Response, NextFunction } from 'express';
import * as contactService from './contact.service';
import { resolveAccessScope } from '../../lib/scopeFilter';
import {
  contactIdParamsSchema,
  createContactSchema,
  listContactsQuerySchema,
  updateContactSchema,
} from './contact.schema';

function scopeFor(req: Request, action: 'view' | 'edit' | 'delete') {
  return resolveAccessScope({
    accountType: req.user!.accountType,
    companyId: req.user!.companyId,
    grant: req.scope!,
    ownerKey: req.scope!.ownerKey,
    action,
  });
}

export async function listContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, companyId } = listContactsQuerySchema.parse(req.query);
    const scope = await scopeFor(req, 'view');
    const result = await contactService.getContacts(page, limit, search, scope, companyId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getContact(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = contactIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const contact = await contactService.getContactById(id, scope);
    res.json(contact);
  } catch (error) {
    next(error);
  }
}

export async function createContact(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createContactSchema.parse(req.body);
    const contact = await contactService.createContact(data, req.user?.userId);
    res.status(201).json(contact);
  } catch (error) {
    next(error);
  }
}

export async function updateContact(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = contactIdParamsSchema.parse(req.params);
    const data = updateContactSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const contact = await contactService.updateContact(id, data, req.user?.userId, scope);
    res.json(contact);
  } catch (error) {
    next(error);
  }
}

export async function deleteContact(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = contactIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await contactService.deleteContact(id, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listContactCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = contactIdParamsSchema.parse(req.params);
    const data = await contactService.getContactCompanies(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listContactDeals(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = contactIdParamsSchema.parse(req.params);
    const data = await contactService.getContactDeals(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listContactPartnerships(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = contactIdParamsSchema.parse(req.params);
    const data = await contactService.getContactPartnerships(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listContactTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = contactIdParamsSchema.parse(req.params);
    const data = await contactService.getContactTickets(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

import type { NextFunction, Request, Response } from 'express';
import * as ticketService from './ticket.service';
import { sendTicketReply } from './ticketReply.service';
import { resolveAccessScope, resolveCompanyHubspotId } from '../../lib/scopeFilter';
import {
  createTicketSchema,
  listTicketsQuerySchema,
  replyToTicketSchema,
  ticketIdParamsSchema,
  updateTicketSchema,
  updateTicketStageSchema,
} from './ticket.schema';

function scopeFor(req: Request, action: 'view' | 'edit' | 'delete') {
  return resolveAccessScope({
    accountType: req.user!.accountType,
    companyId: req.user!.companyId,
    grant: req.scope!,
    ownerKey: req.scope!.ownerKey,
    action,
  });
}

export async function listTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, pipeline } = listTicketsQuerySchema.parse(req.query);
    const scope = await scopeFor(req, 'view');
    const result = await ticketService.getTickets(page, limit, search, pipeline, scope);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTicketsForBoard(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const scope = await scopeFor(req, 'view');
    const data = await ticketService.getTicketsForBoard(search, scope);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = ticketIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const t = await ticketService.getTicketById(id, scope);
    res.json(t);
  } catch (error) {
    next(error);
  }
}

export async function createTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTicketSchema.parse(req.body);
    const isPortal = req.user!.accountType !== 'internal';
    const companyHubspotId = isPortal ? await resolveCompanyHubspotId(req.user!.companyId) : null;
    const t = await ticketService.createTicket(input, req.user?.userId, isPortal ? req.user!.userId : undefined, companyHubspotId);
    res.status(201).json(t);
  } catch (error) {
    next(error);
  }
}

export async function updateTicketStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = ticketIdParamsSchema.parse(req.params);
    const { stage } = updateTicketStageSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const t = await ticketService.updateTicketStage(id, stage, req.user?.userId, scope);
    res.json(t);
  } catch (error) {
    next(error);
  }
}

export async function updateTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = ticketIdParamsSchema.parse(req.params);
    const input = updateTicketSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const t = await ticketService.updateTicket(id, input, scope);
    res.json(t);
  } catch (error) {
    next(error);
  }
}

export async function deleteTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = ticketIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await ticketService.deleteTicket(id, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listTicketContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = ticketIdParamsSchema.parse(req.params);
    const data = await ticketService.getTicketContacts(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listTicketCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = ticketIdParamsSchema.parse(req.params);
    const data = await ticketService.getTicketCompanies(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listTicketDeals(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = ticketIdParamsSchema.parse(req.params);
    const data = await ticketService.getTicketDeals(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function replyToTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = ticketIdParamsSchema.parse(req.params);
    const { content } = replyToTicketSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    await sendTicketReply(id, content, req.user?.userId, scope);
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
}

import { Router } from 'express';
import {
  createTicket,
  deleteTicket,
  getTicket,
  getTicketsForBoard,
  listTicketCompanies,
  listTicketContacts,
  listTicketDeals,
  listTickets,
  replyToTicket,
  updateTicket,
  updateTicketStage,
} from './ticket.controller';
import { requireModule } from '../../middlewares/authorize';

export const ticketRoutes = Router();

ticketRoutes.get('/', requireModule('tickets', 'view'), listTickets);
ticketRoutes.get('/board', requireModule('tickets', 'view'), getTicketsForBoard);
ticketRoutes.post('/', requireModule('tickets', 'create'), createTicket);
ticketRoutes.patch('/:id/stage', requireModule('tickets', 'edit'), updateTicketStage);
ticketRoutes.post('/:id/reply', requireModule('tickets', 'edit'), replyToTicket);
ticketRoutes.get('/:id/contacts', requireModule('tickets', 'view'), listTicketContacts);
ticketRoutes.get('/:id/companies', requireModule('tickets', 'view'), listTicketCompanies);
ticketRoutes.get('/:id/deals', requireModule('tickets', 'view'), listTicketDeals);
ticketRoutes.get('/:id', requireModule('tickets', 'view'), getTicket);
ticketRoutes.put('/:id', requireModule('tickets', 'edit'), updateTicket);
ticketRoutes.delete('/:id', requireModule('tickets', 'delete'), deleteTicket);

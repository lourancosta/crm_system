import { Router } from 'express';
import {
  createContact,
  deleteContact,
  getContact,
  listContactCompanies,
  listContactDeals,
  listContactPartnerships,
  listContactTickets,
  listContacts,
  updateContact,
} from './contact.controller';
import { requireModule } from '../../middlewares/authorize';

export const contactRoutes = Router();

contactRoutes.get('/', requireModule('contacts', 'view'), listContacts);
contactRoutes.get('/:id/companies', requireModule('contacts', 'view'), listContactCompanies);
contactRoutes.get('/:id/deals', requireModule('contacts', 'view'), listContactDeals);
contactRoutes.get('/:id/partnerships', requireModule('contacts', 'view'), listContactPartnerships);
contactRoutes.get('/:id/tickets', requireModule('contacts', 'view'), listContactTickets);
contactRoutes.get('/:id', requireModule('contacts', 'view'), getContact);
contactRoutes.post('/', requireModule('contacts', 'create'), createContact);
contactRoutes.put('/:id', requireModule('contacts', 'edit'), updateContact);
contactRoutes.delete('/:id', requireModule('contacts', 'delete'), deleteContact);

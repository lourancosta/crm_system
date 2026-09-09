import { Router } from 'express';
import { createInbox, deleteInbox, listInboxes, updateInbox } from './supportInbox.controller';

export const supportInboxRoutes = Router();

supportInboxRoutes.get('/', listInboxes);
supportInboxRoutes.post('/', createInbox);
supportInboxRoutes.put('/:id', updateInbox);
supportInboxRoutes.delete('/:id', deleteInbox);

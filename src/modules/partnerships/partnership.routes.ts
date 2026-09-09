import { Router } from 'express';
import {
  createPartnership,
  deletePartnership,
  getPartnership,
  getPartnershipsForBoard,
  listPartnershipCompanies,
  listPartnershipContacts,
  listPartnerships,
  updatePartnership,
  updatePartnershipStage,
} from './partnership.controller';
import { requireModule } from '../../middlewares/authorize';

export const partnershipRoutes = Router();

partnershipRoutes.get('/', requireModule('partnerships', 'view'), listPartnerships);
partnershipRoutes.get('/board', requireModule('partnerships', 'view'), getPartnershipsForBoard);
partnershipRoutes.post('/', requireModule('partnerships', 'create'), createPartnership);
partnershipRoutes.patch('/:id/stage', requireModule('partnerships', 'edit'), updatePartnershipStage);
partnershipRoutes.get('/:id', requireModule('partnerships', 'view'), getPartnership);
partnershipRoutes.get('/:id/companies', requireModule('partnerships', 'view'), listPartnershipCompanies);
partnershipRoutes.get('/:id/contacts', requireModule('partnerships', 'view'), listPartnershipContacts);
partnershipRoutes.put('/:id', requireModule('partnerships', 'edit'), updatePartnership);
partnershipRoutes.delete('/:id', requireModule('partnerships', 'delete'), deletePartnership);

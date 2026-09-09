import { Router } from 'express';
import {
  createDeal,
  deleteDeal,
  getDeal,
  getDealsForBoard,
  listDealCompanies,
  listDealContacts,
  listDealInvoices,
  listDealQuotes,
  listDeals,
  updateDeal,
  updateDealStage,
} from './deal.controller';
import { requireModule } from '../../middlewares/authorize';

export const dealRoutes = Router();

dealRoutes.get('/', requireModule('deals', 'view'), listDeals);
dealRoutes.get('/board', requireModule('deals', 'view'), getDealsForBoard);
dealRoutes.post('/', requireModule('deals', 'create'), createDeal);
dealRoutes.patch('/:id/stage', requireModule('deals', 'edit'), updateDealStage);
dealRoutes.get('/:id/companies', requireModule('deals', 'view'), listDealCompanies);
dealRoutes.get('/:id/contacts', requireModule('deals', 'view'), listDealContacts);
dealRoutes.get('/:id/quotes', requireModule('deals', 'view'), listDealQuotes);
dealRoutes.get('/:id/invoices', requireModule('deals', 'view'), listDealInvoices);
dealRoutes.get('/:id', requireModule('deals', 'view'), getDeal);
dealRoutes.put('/:id', requireModule('deals', 'edit'), updateDeal);
dealRoutes.delete('/:id', requireModule('deals', 'delete'), deleteDeal);

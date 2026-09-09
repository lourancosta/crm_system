import { Router } from 'express';
import {
  createCreditMemo,
  deleteCreditMemo,
  getCreditMemo,
  listAvailableCreditMemos,
  listCreditMemoCompanies,
  listCreditMemoContacts,
  listCreditMemoInvoices,
  listCreditMemos,
  updateCreditMemo,
  voidCreditMemo,
} from './creditMemo.controller';
import { requireModule } from '../../middlewares/authorize';

export const creditMemoRoutes = Router();

creditMemoRoutes.get('/', requireModule('creditMemos', 'view'), listCreditMemos);
// Must come before the /:id catch-all below.
creditMemoRoutes.get('/available', requireModule('creditMemos', 'view'), listAvailableCreditMemos);
creditMemoRoutes.post('/', requireModule('creditMemos', 'create'), createCreditMemo);
creditMemoRoutes.get('/:id/invoices', requireModule('creditMemos', 'view'), listCreditMemoInvoices);
creditMemoRoutes.get('/:id/companies', requireModule('creditMemos', 'view'), listCreditMemoCompanies);
creditMemoRoutes.get('/:id/contacts', requireModule('creditMemos', 'view'), listCreditMemoContacts);
creditMemoRoutes.get('/:id', requireModule('creditMemos', 'view'), getCreditMemo);
creditMemoRoutes.put('/:id', requireModule('creditMemos', 'edit'), updateCreditMemo);
creditMemoRoutes.delete('/:id', requireModule('creditMemos', 'delete'), deleteCreditMemo);
creditMemoRoutes.post('/:id/void', requireModule('creditMemos', 'edit'), voidCreditMemo);

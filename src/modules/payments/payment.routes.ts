import { Router } from 'express';
import {
  createPayment,
  deletePayment,
  getPayment,
  listPaymentCompanies,
  listPaymentInvoices,
  listPayments,
  updatePayment,
} from './payment.controller';
import { requireModule } from '../../middlewares/authorize';

export const paymentRoutes = Router();

paymentRoutes.get('/', requireModule('payments', 'view'), listPayments);
paymentRoutes.post('/', requireModule('payments', 'create'), createPayment);
paymentRoutes.get('/:id/invoices', requireModule('payments', 'view'), listPaymentInvoices);
paymentRoutes.get('/:id/companies', requireModule('payments', 'view'), listPaymentCompanies);
paymentRoutes.get('/:id', requireModule('payments', 'view'), getPayment);
paymentRoutes.put('/:id', requireModule('payments', 'edit'), updatePayment);
paymentRoutes.delete('/:id', requireModule('payments', 'delete'), deletePayment);

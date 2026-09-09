import { Router } from 'express';
import {
  createInvoice,
  createInvoiceCreditMemoApplication,
  createInvoiceDiscount,
  createInvoiceLineItem,
  deleteInvoice,
  deleteInvoiceCreditMemoApplication,
  deleteInvoiceDiscount,
  deleteInvoiceLineItem,
  getInvoice,
  getInvoiceClonePreview,
  getNextInvoiceNumber,
  listInvoiceCompanies,
  listInvoiceContacts,
  listInvoiceCreditMemoApplications,
  listInvoiceCreditMemos,
  listInvoiceDeals,
  listInvoiceDiscounts,
  listInvoiceLineItems,
  listInvoicePayments,
  listInvoices,
  publishInvoice,
  updateInvoice,
  updateInvoiceCreditMemoApplication,
  updateInvoiceDiscount,
  updateInvoiceLineItem,
  voidInvoice,
} from './invoice.controller';
import { requireModule } from '../../middlewares/authorize';

export const invoiceRoutes = Router();

invoiceRoutes.get('/', requireModule('invoices', 'view'), listInvoices);
invoiceRoutes.post('/', requireModule('invoices', 'create'), createInvoice);
// Must come before the /:id catch-all below.
invoiceRoutes.get('/next-number', requireModule('invoices', 'view'), getNextInvoiceNumber);
invoiceRoutes.get('/:id/line-items', requireModule('invoices', 'view'), listInvoiceLineItems);
invoiceRoutes.post('/:id/line-items', requireModule('invoices', 'edit'), createInvoiceLineItem);
invoiceRoutes.put('/:id/line-items/:lineItemId', requireModule('invoices', 'edit'), updateInvoiceLineItem);
invoiceRoutes.delete('/:id/line-items/:lineItemId', requireModule('invoices', 'edit'), deleteInvoiceLineItem);
invoiceRoutes.get('/:id/discounts', requireModule('invoices', 'view'), listInvoiceDiscounts);
invoiceRoutes.post('/:id/discounts', requireModule('invoices', 'edit'), createInvoiceDiscount);
invoiceRoutes.put('/:id/discounts/:discountId', requireModule('invoices', 'edit'), updateInvoiceDiscount);
invoiceRoutes.delete('/:id/discounts/:discountId', requireModule('invoices', 'edit'), deleteInvoiceDiscount);
invoiceRoutes.get('/:id/credit-memo-applications', requireModule('invoices', 'view'), listInvoiceCreditMemoApplications);
invoiceRoutes.post('/:id/credit-memo-applications', requireModule('invoices', 'edit'), createInvoiceCreditMemoApplication);
invoiceRoutes.put('/:id/credit-memo-applications/:applicationId', requireModule('invoices', 'edit'), updateInvoiceCreditMemoApplication);
invoiceRoutes.delete('/:id/credit-memo-applications/:applicationId', requireModule('invoices', 'edit'), deleteInvoiceCreditMemoApplication);
invoiceRoutes.get('/:id/companies', requireModule('invoices', 'view'), listInvoiceCompanies);
invoiceRoutes.get('/:id/contacts', requireModule('invoices', 'view'), listInvoiceContacts);
invoiceRoutes.get('/:id/deals', requireModule('invoices', 'view'), listInvoiceDeals);
invoiceRoutes.get('/:id/payments', requireModule('invoices', 'view'), listInvoicePayments);
invoiceRoutes.get('/:id/credit-memos', requireModule('invoices', 'view'), listInvoiceCreditMemos);
invoiceRoutes.get('/:id', requireModule('invoices', 'view'), getInvoice);
invoiceRoutes.put('/:id', requireModule('invoices', 'edit'), updateInvoice);
invoiceRoutes.delete('/:id', requireModule('invoices', 'delete'), deleteInvoice);
invoiceRoutes.post('/:id/void', requireModule('invoices', 'edit'), voidInvoice);
invoiceRoutes.post('/:id/publish', requireModule('invoices', 'edit'), publishInvoice);
// Read-only preview (no invoice is created here) — actual creation happens
// through the normal POST / once the user reviews/saves the pre-filled form.
invoiceRoutes.get('/:id/clone', requireModule('invoices', 'view'), getInvoiceClonePreview);

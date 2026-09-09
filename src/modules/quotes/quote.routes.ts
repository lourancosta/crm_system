import { Router } from 'express';
import {
  countersignQuote,
  createQuote,
  createQuoteDiscount,
  createQuoteLineItem,
  deleteQuote,
  deleteQuoteDiscount,
  deleteQuoteLineItem,
  getQuote,
  getQuoteSigners,
  getSettings,
  getSignerSetting,
  listQuoteCompanies,
  listQuoteContacts,
  listQuoteDeals,
  listQuoteDiscounts,
  listQuoteLineItems,
  listQuotes,
  publishQuote,
  recallQuote,
  reorderQuoteLineItems,
  resendSignerLink,
  updateQuoteBuyer,
  updateQuoteDeal,
  updateQuoteDetails,
  updateQuoteDiscount,
  updateQuoteLineItem,
  updateQuoteSender,
  updateQuoteSigners,
  updateSettings,
  updateSignerSetting,
} from './quote.controller';
import { requireModule } from '../../middlewares/authorize';

export const quoteRoutes = Router();

quoteRoutes.get('/', requireModule('quotes', 'view'), listQuotes);
quoteRoutes.post('/', requireModule('quotes', 'create'), createQuote);
// Must come before the /:id catch-all below.
quoteRoutes.get('/settings', requireModule('quotes', 'view'), getSettings);
quoteRoutes.put('/settings', requireModule('quotes', 'edit'), updateSettings);
quoteRoutes.get('/settings/signer', requireModule('quotes', 'view'), getSignerSetting);
quoteRoutes.put('/settings/signer', requireModule('quotes', 'edit'), updateSignerSetting);
quoteRoutes.get('/:id', requireModule('quotes', 'view'), getQuote);
quoteRoutes.get('/:id/companies', requireModule('quotes', 'view'), listQuoteCompanies);
quoteRoutes.get('/:id/deals', requireModule('quotes', 'view'), listQuoteDeals);
quoteRoutes.get('/:id/contacts', requireModule('quotes', 'view'), listQuoteContacts);
quoteRoutes.get('/:id/signers', requireModule('quotes', 'view'), getQuoteSigners);
quoteRoutes.put('/:id/signers', requireModule('quotes', 'edit'), updateQuoteSigners);
quoteRoutes.post('/:id/signers/:signerId/resend', requireModule('quotes', 'edit'), resendSignerLink);
quoteRoutes.post('/:id/countersign', requireModule('quotes', 'edit'), countersignQuote);
quoteRoutes.put('/:id/deal', requireModule('quotes', 'edit'), updateQuoteDeal);
quoteRoutes.put('/:id/buyer', requireModule('quotes', 'edit'), updateQuoteBuyer);
quoteRoutes.put('/:id/sender', requireModule('quotes', 'edit'), updateQuoteSender);
quoteRoutes.put('/:id/details', requireModule('quotes', 'edit'), updateQuoteDetails);
quoteRoutes.get('/:id/line-items', requireModule('quotes', 'view'), listQuoteLineItems);
quoteRoutes.post('/:id/line-items', requireModule('quotes', 'edit'), createQuoteLineItem);
// Must come before the /:lineItemId catch-all below.
quoteRoutes.put('/:id/line-items/reorder', requireModule('quotes', 'edit'), reorderQuoteLineItems);
quoteRoutes.put('/:id/line-items/:lineItemId', requireModule('quotes', 'edit'), updateQuoteLineItem);
quoteRoutes.delete('/:id/line-items/:lineItemId', requireModule('quotes', 'edit'), deleteQuoteLineItem);
quoteRoutes.get('/:id/discounts', requireModule('quotes', 'view'), listQuoteDiscounts);
quoteRoutes.post('/:id/discounts', requireModule('quotes', 'edit'), createQuoteDiscount);
quoteRoutes.put('/:id/discounts/:discountId', requireModule('quotes', 'edit'), updateQuoteDiscount);
quoteRoutes.delete('/:id/discounts/:discountId', requireModule('quotes', 'edit'), deleteQuoteDiscount);
quoteRoutes.put('/:id/publish', requireModule('quotes', 'edit'), publishQuote);
quoteRoutes.put('/:id/recall', requireModule('quotes', 'edit'), recallQuote);
quoteRoutes.delete('/:id', requireModule('quotes', 'delete'), deleteQuote);

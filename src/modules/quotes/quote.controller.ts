import type { Request, Response, NextFunction } from 'express';
import * as quoteService from './quote.service';
import * as userRepository from '../users/user.repository';
import { getDefaultSignerUserId, getQuoteSettings, setDefaultSignerUserId, setQuoteSettings } from './quoteSettings.repository';
import { resolveAccessScope } from '../../lib/scopeFilter';
import {
  countersignSchema,
  createLineItemSchema,
  createQuoteDiscountSchema,
  createQuoteSchema,
  discountIdParamsSchema,
  lineItemIdParamsSchema,
  listQuotesQuerySchema,
  quoteIdParamsSchema,
  reorderLineItemsSchema,
  signerIdParamsSchema,
  updateLineItemSchema,
  updateQuoteBuyerSchema,
  updateQuoteDealSchema,
  updateQuoteDetailsSchema,
  updateQuoteDiscountSchema,
  updateQuoteSenderSchema,
  updateQuoteSettingsSchema,
  updateQuoteSignerSettingSchema,
  updateQuoteSignersSchema,
} from './quote.schema';

function scopeFor(req: Request, action: 'view' | 'edit' | 'delete') {
  return resolveAccessScope({
    accountType: req.user!.accountType,
    companyId: req.user!.companyId,
    grant: req.scope!,
    ownerKey: req.scope!.ownerKey,
    action,
  });
}

export async function listQuotes(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, status } = listQuotesQuerySchema.parse(req.query);
    const scope = await scopeFor(req, 'view');
    const result = await quoteService.getQuotes(page, limit, search, status, scope);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const q = await quoteService.getQuoteById(id, scope);
    res.json(q);
  } catch (error) {
    next(error);
  }
}

export async function listQuoteCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const data = await quoteService.getQuoteCompanies(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listQuoteDeals(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const data = await quoteService.getQuoteDeals(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listQuoteContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const data = await quoteService.getQuoteContacts(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getQuoteSigners(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const data = await quoteService.getQuoteSigners(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function updateQuoteSigners(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const { contactIds, signerUserId } = updateQuoteSignersSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const data = await quoteService.updateQuoteSigners(id, contactIds, signerUserId, scope);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function resendSignerLink(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, signerId } = signerIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'edit');
    await quoteService.resendSignerLink(id, signerId, scope);
    res.json({ message: 'Signature request resent.' });
  } catch (error) {
    next(error);
  }
}

export async function countersignQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const { signatureImage } = countersignSchema.parse(req.body);
    const meta = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const data = await quoteService.countersignQuote(id, req.user!.userId, { signatureImage, ...meta });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function createQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { dealId } = createQuoteSchema.parse(req.body);
    const q = await quoteService.createQuote(dealId);
    res.status(201).json(q);
  } catch (error) {
    next(error);
  }
}

export async function updateQuoteDeal(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const { dealId } = updateQuoteDealSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const q = await quoteService.updateQuoteDeal(id, dealId, scope);
    res.json(q);
  } catch (error) {
    next(error);
  }
}

export async function updateQuoteBuyer(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const { companyId, contactIds } = updateQuoteBuyerSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const q = await quoteService.updateQuoteBuyer(id, companyId, contactIds, scope);
    res.json(q);
  } catch (error) {
    next(error);
  }
}

export async function updateQuoteSender(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const input = updateQuoteSenderSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const q = await quoteService.updateQuoteSender(id, input, scope);
    res.json(q);
  } catch (error) {
    next(error);
  }
}

export async function updateQuoteDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const input = updateQuoteDetailsSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const q = await quoteService.updateQuoteDetails(id, input, scope);
    res.json(q);
  } catch (error) {
    next(error);
  }
}

export async function publishQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'edit');
    const q = await quoteService.publishQuote(id, scope);
    res.json(q);
  } catch (error) {
    next(error);
  }
}

export async function recallQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'edit');
    const q = await quoteService.recallQuote(id, scope);
    res.json(q);
  } catch (error) {
    next(error);
  }
}

export async function deleteQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await quoteService.deleteQuote(id, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listQuoteLineItems(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const items = await quoteService.getQuoteLineItems(id);
    res.json(items);
  } catch (error) {
    next(error);
  }
}

export async function createQuoteLineItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const input = createLineItemSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const item = await quoteService.createQuoteLineItem(id, input, scope);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

export async function updateQuoteLineItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, lineItemId } = lineItemIdParamsSchema.parse(req.params);
    const input = updateLineItemSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const item = await quoteService.updateQuoteLineItem(id, lineItemId, input, scope);
    res.json(item);
  } catch (error) {
    next(error);
  }
}

export async function reorderQuoteLineItems(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const { lineItemIds } = reorderLineItemsSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    await quoteService.reorderQuoteLineItems(id, lineItemIds, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function deleteQuoteLineItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, lineItemId } = lineItemIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await quoteService.deleteQuoteLineItem(id, lineItemId, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listQuoteDiscounts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const data = await quoteService.getQuoteDiscounts(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function createQuoteDiscount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const input = createQuoteDiscountSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const discount = await quoteService.createQuoteDiscount(id, input, scope);
    res.status(201).json(discount);
  } catch (error) {
    next(error);
  }
}

export async function updateQuoteDiscount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, discountId } = discountIdParamsSchema.parse(req.params);
    const input = updateQuoteDiscountSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const discount = await quoteService.updateQuoteDiscount(id, discountId, input, scope);
    res.json(discount);
  } catch (error) {
    next(error);
  }
}

export async function deleteQuoteDiscount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, discountId } = discountIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await quoteService.deleteQuoteDiscount(id, discountId, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getQuoteSettings());
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const { defaultExpirationDays } = updateQuoteSettingsSchema.parse(req.body);
    res.json(await setQuoteSettings(defaultExpirationDays));
  } catch (error) {
    next(error);
  }
}

export async function getSignerSetting(_req: Request, res: Response, next: NextFunction) {
  try {
    const defaultSignerUserId = await getDefaultSignerUserId();
    const signerUser = defaultSignerUserId ? await userRepository.findById(defaultSignerUserId) : null;
    res.json({
      defaultSignerUserId,
      defaultSignerName: signerUser ? `${signerUser.firstName} ${signerUser.lastName}` : null,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSignerSetting(req: Request, res: Response, next: NextFunction) {
  try {
    const { defaultSignerUserId } = updateQuoteSignerSettingSchema.parse(req.body);
    res.json({ defaultSignerUserId: await setDefaultSignerUserId(defaultSignerUserId) });
  } catch (error) {
    next(error);
  }
}

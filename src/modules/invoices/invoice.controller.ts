import type { Request, Response, NextFunction } from 'express';
import * as invoiceService from './invoice.service';
import { resolveAccessScope } from '../../lib/scopeFilter';
import {
  createCreditMemoApplicationSchema,
  createInvoiceDiscountSchema,
  createInvoiceSchema,
  createLineItemSchema,
  creditMemoApplicationIdParamsSchema,
  discountIdParamsSchema,
  invoiceIdParamsSchema,
  lineItemIdParamsSchema,
  listInvoicesQuerySchema,
  updateCreditMemoApplicationSchema,
  updateInvoiceDetailsSchema,
  updateInvoiceDiscountSchema,
  updateLineItemSchema,
} from './invoice.schema';

function scopeFor(req: Request, action: 'view' | 'edit' | 'delete') {
  return resolveAccessScope({
    accountType: req.user!.accountType,
    companyId: req.user!.companyId,
    grant: req.scope!,
    ownerKey: req.scope!.ownerKey,
    action,
  });
}

export async function listInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, status, type } = listInvoicesQuerySchema.parse(req.query);
    const scope = await scopeFor(req, 'view');
    const result = await invoiceService.getInvoices(page, limit, search, status, type, scope);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const inv = await invoiceService.getInvoiceById(id, scope);
    res.json(inv);
  } catch (error) {
    next(error);
  }
}

export async function listInvoiceLineItems(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const items = await invoiceService.getInvoiceLineItems(id);
    res.json(items);
  } catch (error) {
    next(error);
  }
}

export async function listInvoiceCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const data = await invoiceService.getInvoiceCompanies(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listInvoiceContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const data = await invoiceService.getInvoiceContacts(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listInvoiceDeals(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const data = await invoiceService.getInvoiceDeals(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listInvoicePayments(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const data = await invoiceService.getInvoicePayments(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listInvoiceCreditMemos(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const data = await invoiceService.getInvoiceCreditMemos(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getNextInvoiceNumber(req: Request, res: Response, next: NextFunction) {
  try {
    const nextNumber = await invoiceService.getNextInvoiceNumber();
    res.json({ nextNumber });
  } catch (error) {
    next(error);
  }
}

export async function createInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createInvoiceSchema.parse(req.body);
    const inv = await invoiceService.createInvoice(input, req.user?.userId);
    res.status(201).json(inv);
  } catch (error) {
    next(error);
  }
}

export async function getInvoiceClonePreview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'view');
    const preview = await invoiceService.getInvoiceClonePreview(id, scope);
    res.json(preview);
  } catch (error) {
    next(error);
  }
}

export async function updateInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const input = updateInvoiceDetailsSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const inv = await invoiceService.updateInvoice(id, input, scope);
    res.json(inv);
  } catch (error) {
    next(error);
  }
}

export async function deleteInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await invoiceService.deleteInvoice(id, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function voidInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'edit');
    const inv = await invoiceService.voidInvoice(id, scope);
    res.json(inv);
  } catch (error) {
    next(error);
  }
}

export async function publishInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'edit');
    const inv = await invoiceService.publishInvoice(id, scope);
    res.json(inv);
  } catch (error) {
    next(error);
  }
}

export async function createInvoiceLineItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const input = createLineItemSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const item = await invoiceService.createInvoiceLineItem(id, input, scope);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

export async function updateInvoiceLineItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, lineItemId } = lineItemIdParamsSchema.parse(req.params);
    const input = updateLineItemSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const item = await invoiceService.updateInvoiceLineItem(id, lineItemId, input, scope);
    res.json(item);
  } catch (error) {
    next(error);
  }
}

export async function deleteInvoiceLineItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, lineItemId } = lineItemIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await invoiceService.deleteInvoiceLineItem(id, lineItemId, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listInvoiceDiscounts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const data = await invoiceService.getInvoiceDiscounts(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function createInvoiceDiscount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const input = createInvoiceDiscountSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const discount = await invoiceService.createInvoiceDiscount(id, input, scope);
    res.status(201).json(discount);
  } catch (error) {
    next(error);
  }
}

export async function updateInvoiceDiscount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, discountId } = discountIdParamsSchema.parse(req.params);
    const input = updateInvoiceDiscountSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const discount = await invoiceService.updateInvoiceDiscount(id, discountId, input, scope);
    res.json(discount);
  } catch (error) {
    next(error);
  }
}

export async function deleteInvoiceDiscount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, discountId } = discountIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await invoiceService.deleteInvoiceDiscount(id, discountId, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listInvoiceCreditMemoApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const data = await invoiceService.getInvoiceCreditMemoApplications(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function createInvoiceCreditMemoApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const input = createCreditMemoApplicationSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const application = await invoiceService.createInvoiceCreditMemoApplication(id, input, scope);
    res.status(201).json(application);
  } catch (error) {
    next(error);
  }
}

export async function updateInvoiceCreditMemoApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, applicationId } = creditMemoApplicationIdParamsSchema.parse(req.params);
    const input = updateCreditMemoApplicationSchema.parse(req.body);
    const scope = await scopeFor(req, 'edit');
    const application = await invoiceService.updateInvoiceCreditMemoApplication(id, applicationId, input, scope);
    res.json(application);
  } catch (error) {
    next(error);
  }
}

export async function deleteInvoiceCreditMemoApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, applicationId } = creditMemoApplicationIdParamsSchema.parse(req.params);
    const scope = await scopeFor(req, 'delete');
    await invoiceService.deleteInvoiceCreditMemoApplication(id, applicationId, scope);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  getInvoiceById,
  getInvoiceCreditMemoApplications,
  getInvoiceCreditMemos,
  getInvoiceDiscounts,
  getInvoiceLineItems,
} from '../invoices/invoice.service';
import { invoiceIdParamsSchema } from '../invoices/invoice.schema';
import { getAccountDefaults } from '../accountDefaults/accountDefaults.repository';
import {
  getQuoteById,
  getQuoteContacts,
  getQuoteDiscounts,
  getQuoteLineItems,
  getQuoteSigners,
  getSignerByToken,
  signAsContact,
} from '../quotes/quote.service';
import { quoteIdParamsSchema, submitSignatureSchema } from '../quotes/quote.schema';

export const publicRoutes = Router();

// The invoice template (a public, unauthenticated page) shows the company's
// own address and wire-transfer details — the same info previously hardcoded
// into that page's source, now editable from Settings > Account Defaults
// instead of requiring a code change.
publicRoutes.get('/account-defaults', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await getAccountDefaults());
  } catch (error) {
    next(error);
  }
});

// A still-draft invoice isn't "issued" yet — its public link shouldn't work
// until it's been created/published (see invoice.service.ts's publishInvoice).
async function requirePublishedInvoice(id: string) {
  const inv = await getInvoiceById(id);
  if ((inv.hsInvoiceStatus ?? '').toLowerCase() === 'draft') {
    const err = new Error('Invoice not available') as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  return inv;
}

publicRoutes.get('/invoices/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    const inv = await requirePublishedInvoice(id);
    res.json(inv);
  } catch (error) {
    next(error);
  }
});

publicRoutes.get('/invoices/:id/line-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    await requirePublishedInvoice(id);
    const items = await getInvoiceLineItems(id);
    res.json(items);
  } catch (error) {
    next(error);
  }
});

publicRoutes.get('/invoices/:id/discounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    await requirePublishedInvoice(id);
    const discounts = await getInvoiceDiscounts(id);
    res.json(discounts);
  } catch (error) {
    next(error);
  }
});

publicRoutes.get('/invoices/:id/credit-memo-applications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    await requirePublishedInvoice(id);
    const applications = await getInvoiceCreditMemoApplications(id);
    res.json(applications);
  } catch (error) {
    next(error);
  }
});

// Just the credit memo number (hsNumber) is needed to label each application
// on the public preview — reuses the same authenticated-side lookup since
// the credit memo's own detail data isn't sensitive on an already-public
// invoice link.
publicRoutes.get('/invoices/:id/credit-memos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = invoiceIdParamsSchema.parse(req.params);
    await requirePublishedInvoice(id);
    const creditMemos = await getInvoiceCreditMemos(id);
    res.json(creditMemos);
  } catch (error) {
    next(error);
  }
});

// Mirrors requirePublishedInvoice above — a quote recalled back to Draft
// (see quote.service.ts's recallQuote) stops being reachable via its own
// public link, the same way a still-draft invoice is.
async function requirePublishedQuote(id: string) {
  const q = await getQuoteById(id);
  if ((q.hsQuoteStatus ?? '').toUpperCase() === 'DRAFT') {
    const err = new Error('Quote not available') as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  return q;
}

publicRoutes.get('/quotes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    const q = await requirePublishedQuote(id);
    res.json(q);
  } catch (error) {
    next(error);
  }
});

publicRoutes.get('/quotes/:id/line-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    await requirePublishedQuote(id);
    res.json(await getQuoteLineItems(id));
  } catch (error) {
    next(error);
  }
});

publicRoutes.get('/quotes/:id/discounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    await requirePublishedQuote(id);
    res.json(await getQuoteDiscounts(id));
  } catch (error) {
    next(error);
  }
});

publicRoutes.get('/quotes/:id/contacts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    await requirePublishedQuote(id);
    res.json(await getQuoteContacts(id));
  } catch (error) {
    next(error);
  }
});

// Sanitized signer list for the "no token in the URL" view — just enough to
// show who still needs to sign, never the email/token fields the
// authenticated GET /quotes/:id/signers exposes.
publicRoutes.get('/quotes/:id/signers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = quoteIdParamsSchema.parse(req.params);
    await requirePublishedQuote(id);
    const signers = await getQuoteSigners(id);
    res.json(signers.map((s) => ({ id: s.id, signerType: s.signerType, signerName: s.signerName, signed: Boolean(s.signedAt) })));
  } catch (error) {
    next(error);
  }
});

// Resolves an individual signer's own token (from their emailed link) to
// their name + signed state — drives the "Sign as {name}" / "you already
// signed" states on the preview page. Never exposes the token itself back.
publicRoutes.get('/quotes/:id/signer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const signer = await getSignerByToken(token);
    res.json({ signerName: signer.signerName, signed: Boolean(signer.signedAt), signedAt: signer.signedAt });
  } catch (error) {
    next(error);
  }
});

publicRoutes.post('/quotes/:id/sign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, signatureImage } = submitSignatureSchema.parse(req.body);
    const signature = await signAsContact(token, {
      signatureImage,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(201).json(signature);
  } catch (error) {
    next(error);
  }
});

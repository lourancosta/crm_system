import { z } from 'zod';

export const invoiceIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  status: z.enum(['open', 'paid', 'voided', 'draft']).optional(),
  type: z.enum(['reseller', 'msp']).optional(),
});

export const createLineItemSchema = z.object({
  productId: z.string().uuid('productId must be a valid UUID'),
  quantity: z.coerce.number().positive().default(1),
  price: z.coerce.number().min(0).optional(),
  hsDiscountPercentage: z.coerce.number().min(0).max(100).optional(),
  // Lets a line item's display name/description diverge from the product's
  // own (e.g. renamed at invoice-creation time) — falls back to the
  // product's own values when omitted.
  name: z.string().optional(),
  description: z.string().optional(),
  // Which end customer this line item bills to — used to group/subtotal
  // line items on the invoice preview and detail page when one invoice
  // covers multiple customers (e.g. an MSP reselling to several tenants).
  customerName: z.string().optional(),
});

export const createInvoiceDiscountSchema = z.object({
  name: z.string().min(1, 'name is required'),
  kind: z.enum(['percentage', 'amount']),
  value: z.coerce.number().min(0),
});

export const createCreditMemoApplicationSchema = z.object({
  creditMemoId: z.string().uuid('creditMemoId must be a valid UUID'),
  amount: z.coerce.number().positive(),
});

export const createInvoiceSchema = z.object({
  companyId: z.string().uuid('companyId must be a valid UUID'),
  contactId: z.string().uuid('contactId must be a valid UUID'),
  hsInvoiceDate: z.coerce.date(),
  hsDueDate: z.coerce.date(),
  // Present only when a Net option was picked client-side; omitted for "Custom date".
  hsNetPaymentTerm: z.coerce.number().int().positive().optional(),
  typeObj: z.enum(['reseller', 'msp']),
  tenant: z.string().optional(),
  hsCurrency: z.string().default('USD'),
  // Reseller-only "X / N" position, entered by hand at creation time since a
  // new invoice isn't necessarily associated with a deal yet.
  installmentNumber: z.coerce.number().int().positive().optional(),
  installmentTotal: z.coerce.number().int().positive().optional(),
  lineItems: z.array(createLineItemSchema).min(1, 'At least one line item is required'),
  discounts: z.array(createInvoiceDiscountSchema).optional().default([]),
  creditMemoApplications: z.array(createCreditMemoApplicationSchema).optional().default([]),
});

// The edit modal reuses the create form for every invoice-level field, but
// line items and discounts are mutated separately through their own
// per-item endpoints — see UpdateInvoiceDetailsInput in invoice.types.ts.
export const updateInvoiceDetailsSchema = createInvoiceSchema.omit({
  lineItems: true,
  discounts: true,
  creditMemoApplications: true,
});

export const updateLineItemSchema = z.object({
  quantity: z.coerce.number().positive().optional(),
  price: z.coerce.number().min(0).optional(),
  hsDiscountPercentage: z.coerce.number().min(0).max(100).optional(),
  description: z.string().optional(),
  customerName: z.string().optional(),
});

export const lineItemIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  lineItemId: z.string().uuid('lineItemId must be a valid UUID'),
});

export const updateInvoiceDiscountSchema = createInvoiceDiscountSchema.partial();

export const discountIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  discountId: z.string().uuid('discountId must be a valid UUID'),
});

export const updateCreditMemoApplicationSchema = z.object({
  amount: z.coerce.number().positive(),
});

export const creditMemoApplicationIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  applicationId: z.string().uuid('applicationId must be a valid UUID'),
});

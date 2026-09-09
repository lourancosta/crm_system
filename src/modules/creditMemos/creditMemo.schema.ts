import { z } from 'zod';

export const creditMemoIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const listCreditMemosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().default(''),
  // 'unapplied'/'partially_applied'/'applied' are computed live from
  // appliedAmount vs hsAmountCredited, not a stored column — see
  // CreditMemoStatusBadge's creditMemoStatusKey on the client, mirrored in
  // SQL by creditMemo.repository.ts's findAll.
  status: z.enum(['unapplied', 'partially_applied', 'applied', 'voided', 'draft']).optional(),
});

export const createCreditMemoSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  amount: z.string().min(1),
  reason: z.string().optional(),
  companyId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});

export const updateCreditMemoSchema = z.object({
  amount: z.string().min(1).optional(),
  reason: z.string().optional(),
});

export const listAvailableCreditMemosQuerySchema = z.object({
  companyId: z.string().uuid(),
  excludeInvoiceId: z.string().uuid().optional(),
});

import { z } from 'zod';
import { PAYMENT_METHODS } from './payment.types';

export const paymentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().default(''),
});

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.string().min(1),
  paymentDate: z.string().min(1),
  paymentMethod: z.enum(PAYMENT_METHODS),
  referenceNumber: z.string().optional(),
  internalNote: z.string().optional(),
});

export const updatePaymentSchema = createPaymentSchema.omit({ invoiceId: true }).partial();

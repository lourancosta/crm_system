import { z } from 'zod';

export const productIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().default(''),
  type: z.enum(['single', 'bundle']).optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  hsSku: z.string().optional(),
  hsPriceUsd: z.string().optional(),
  controllerUnitPrice: z.string().optional(),
  hsProductType: z.string().optional(),
  hsPricingModel: z.string().optional(),
  recurringbillingfrequency: z.string().optional(),
  controllerOriginalQuantity: z.string().optional(),
  module: z.string().optional(),
  groupLicense: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

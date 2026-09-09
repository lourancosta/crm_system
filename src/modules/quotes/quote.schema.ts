import { z } from 'zod';

export const listQuotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'AWAITING_COUNTERSIGNATURE', 'SIGNED', 'EXPIRED', 'ARCHIVED']).optional(),
});

export const quoteIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const updateQuoteSettingsSchema = z.object({
  defaultExpirationDays: z.coerce.number().int().min(1).max(3650),
});

export const createQuoteSchema = z.object({
  dealId: z.string().uuid('dealId must be a valid UUID'),
});

export const updateQuoteDealSchema = z.object({
  dealId: z.string().uuid('dealId must be a valid UUID'),
});

export const updateQuoteBuyerSchema = z.object({
  companyId: z.string().uuid('companyId must be a valid UUID'),
  contactIds: z.array(z.string().uuid()).default([]),
});

export const updateQuoteSenderSchema = z.object({
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  jobtitle: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  companyName: z.string().optional(),
});

export const updateQuoteDetailsSchema = z.object({
  name: z.string().min(1, 'name is required').optional(),
  expirationDate: z.coerce.date().optional(),
  commentsToBuyer: z.string().optional(),
  purchaseTerms: z.string().optional(),
});

const billingStartTypeSchema = z.enum(['at_payment', 'custom_date', 'delayed_days', 'delayed_months']);
const billingFrequencySchema = z.enum(['one_time', 'monthly', 'quarterly', 'annually']);
const lineItemDiscountKindSchema = z.enum(['percentage', 'amount']);

export const createLineItemSchema = z.object({
  productId: z.string().uuid('productId must be a valid UUID'),
  quantity: z.coerce.number().positive().default(1),
  price: z.coerce.number().min(0).optional(),
  hsDiscountPercentage: z.coerce.number().min(0).max(100).optional(),
  discount: z.coerce.number().min(0).optional(),
  discountType: lineItemDiscountKindSchema.optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  customerName: z.string().optional(),
  hsBillingStartDelayType: billingStartTypeSchema.optional(),
  hsBillingStartDelayDays: z.coerce.number().int().min(0).optional(),
  hsBillingStartDelayMonths: z.coerce.number().int().min(0).optional(),
  hsRecurringBillingStartDate: z.string().optional(),
  hsTermInMonths: z.coerce.number().int().positive().optional(),
  recurringbillingfrequency: billingFrequencySchema.optional(),
});

export const updateLineItemSchema = z.object({
  quantity: z.coerce.number().positive().optional(),
  price: z.coerce.number().min(0).optional(),
  // Nullable — switching discountType away from the one that used it needs
  // to actually clear the now-irrelevant value, same pattern as the
  // billing-start fields below.
  hsDiscountPercentage: z.coerce.number().min(0).max(100).nullable().optional(),
  discount: z.coerce.number().min(0).nullable().optional(),
  discountType: lineItemDiscountKindSchema.optional(),
  description: z.string().optional(),
  customerName: z.string().optional(),
  hsBillingStartDelayType: billingStartTypeSchema.optional(),
  // Nullable (not just optional) — switching billing start type away from
  // e.g. custom_date needs to actually clear the now-irrelevant date/day/
  // month value in the DB, not just leave the field untouched.
  hsBillingStartDelayDays: z.coerce.number().int().min(0).nullable().optional(),
  hsBillingStartDelayMonths: z.coerce.number().int().min(0).nullable().optional(),
  hsRecurringBillingStartDate: z.string().nullable().optional(),
  hsTermInMonths: z.coerce.number().int().positive().optional(),
  recurringbillingfrequency: billingFrequencySchema.optional(),
});

export const lineItemIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  lineItemId: z.string().uuid('lineItemId must be a valid UUID'),
});

export const reorderLineItemsSchema = z.object({
  lineItemIds: z.array(z.string().uuid()).min(1),
});

export const createQuoteDiscountSchema = z.object({
  name: z.string().min(1, 'name is required'),
  kind: z.enum(['percentage', 'amount']),
  value: z.coerce.number().min(0),
});

export const updateQuoteDiscountSchema = createQuoteDiscountSchema.partial();

export const discountIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  discountId: z.string().uuid('discountId must be a valid UUID'),
});

export const updateQuoteSignersSchema = z.object({
  contactIds: z.array(z.string().uuid()),
  // null means "use the standard countersigner from Settings > Objects >
  // Quote > Signature at publish time"; a specific id overrides it just for
  // this quote.
  signerUserId: z.string().uuid().nullable(),
});

export const signerIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  signerId: z.string().uuid('signerId must be a valid UUID'),
});

export const submitSignatureSchema = z.object({
  token: z.string().min(1, 'token is required'),
  signatureImage: z.string().min(1, 'signatureImage is required'),
  agreedToTerms: z.literal(true),
});

export const countersignSchema = z.object({
  signatureImage: z.string().min(1, 'signatureImage is required'),
});

export const updateQuoteSignerSettingSchema = z.object({
  defaultSignerUserId: z.string().uuid().nullable(),
});

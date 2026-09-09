import { z } from 'zod';

export const updateAccountDefaultsSchema = z.object({
  companyName: z.string().nullable(),
  companyDomain: z.string().nullable(),
  address: z.string().nullable(),
  address2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
  country: z.string().nullable(),
  bankName: z.string().nullable(),
  bankRoutingNumber: z.string().nullable(),
  bankSwiftCode: z.string().nullable(),
  bankAccountNumber: z.string().nullable(),
  billingContactEmail: z.string().nullable(),
  bankAddress: z.string().nullable(),
  bankAddress2: z.string().nullable(),
  bankCity: z.string().nullable(),
  bankState: z.string().nullable(),
  bankZip: z.string().nullable(),
  bankCountry: z.string().nullable(),
});

import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { accountDefaults } from '../../db/schema';
import type { AccountDefaults } from './accountDefaults.types';

const SETTINGS_ID = 'default';

const FIELDS = {
  companyName: accountDefaults.companyName,
  companyDomain: accountDefaults.companyDomain,
  address: accountDefaults.address,
  address2: accountDefaults.address2,
  city: accountDefaults.city,
  state: accountDefaults.state,
  zip: accountDefaults.zip,
  country: accountDefaults.country,
  bankName: accountDefaults.bankName,
  bankRoutingNumber: accountDefaults.bankRoutingNumber,
  bankSwiftCode: accountDefaults.bankSwiftCode,
  bankAccountNumber: accountDefaults.bankAccountNumber,
  billingContactEmail: accountDefaults.billingContactEmail,
  bankAddress: accountDefaults.bankAddress,
  bankAddress2: accountDefaults.bankAddress2,
  bankCity: accountDefaults.bankCity,
  bankState: accountDefaults.bankState,
  bankZip: accountDefaults.bankZip,
  bankCountry: accountDefaults.bankCountry,
} as const;

const EMPTY: AccountDefaults = {
  companyName: null,
  companyDomain: null,
  address: null,
  address2: null,
  city: null,
  state: null,
  zip: null,
  country: null,
  bankName: null,
  bankRoutingNumber: null,
  bankSwiftCode: null,
  bankAccountNumber: null,
  billingContactEmail: null,
  bankAddress: null,
  bankAddress2: null,
  bankCity: null,
  bankState: null,
  bankZip: null,
  bankCountry: null,
};

export async function getAccountDefaults(): Promise<AccountDefaults> {
  const rows = await db.select(FIELDS).from(accountDefaults).where(eq(accountDefaults.id, SETTINGS_ID)).limit(1);
  return rows[0] ?? EMPTY;
}

export async function setAccountDefaults(input: AccountDefaults): Promise<AccountDefaults> {
  await db
    .insert(accountDefaults)
    .values({ id: SETTINGS_ID, ...input, updatedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
  const rows = await db.select(FIELDS).from(accountDefaults).where(eq(accountDefaults.id, SETTINGS_ID)).limit(1);
  return rows[0];
}

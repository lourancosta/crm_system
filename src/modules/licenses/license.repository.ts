import { randomUUID } from "crypto";
import { and, count, desc, eq, or } from "drizzle-orm";
import { ilike } from "../../lib/sqlHelpers";
import { db } from "../../db/client";
import { company, dynamicAssociation, license } from "../../db/schema";
import { scopeCondition, type RecordAccessScope } from "../../lib/scopeFilter";
import type { CreateLicenseInput, License, PaginatedResult, UpdateLicenseInput } from "./license.types";

const licenseColumns = { hubspotId: license.hubspotId, hubspotOwnerId: license.hubspotOwnerId };

// Licenses are a HubSpot custom object — associations key off this raw type
// ID (portal-specific), same constant already hardcoded the other way around
// in company.repository.ts (company -> licenses).
const LICENSE_OBJECT_TYPE = "2-24278650";

export type AssociatedCompany = {
  id: string;
  name: string | null;
  domain: string | null;
  website: string | null;
};

const LICENSE_FIELDS = {
  id: license.id,
  hubspotId: license.hubspotId,
  archived: license.archived,
  name: license.name,
  status: license.status,
  customerName: license.customerName,
  partnerName: license.partnerName,
  typeObj: license.typeObj,
  subscription: license.subscription,
  quantity: license.quantity,
  platformCreatedDate: license.platformCreatedDate,
  activationDate: license.activationDate,
  expirationDate: license.expirationDate,
  licenseGroup: license.licenseGroup,
  module: license.module,
  revokeDate: license.revokeDate,
  createdAt: license.createdAt,
  updatedAt: license.updatedAt,
};

export async function findAll(
  page: number,
  limit: number,
  search?: string,
  status?: string,
  subscription?: string,
  scope?: RecordAccessScope,
): Promise<PaginatedResult<License>> {
  const where = and(
    eq(license.archived, false),
    search
      ? or(
          ilike(license.customerName, `%${search}%`),
          ilike(license.partnerName, `%${search}%`),
        )
      : undefined,
    status ? eq(license.status, status) : undefined,
    subscription ? eq(license.subscription, subscription) : undefined,
    scopeCondition(scope, "licenses", licenseColumns),
  );

  const [data, countResult] = await Promise.all([
    db
      .select(LICENSE_FIELDS)
      .from(license)
      .where(where)
      .orderBy(desc(license.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: count() }).from(license).where(where),
  ]);

  return { data, total: Number(countResult[0].count), page, limit };
}

export async function findById(id: string, scope?: RecordAccessScope): Promise<License | null> {
  const rows = await db
    .select(LICENSE_FIELDS)
    .from(license)
    .where(and(eq(license.id, id), eq(license.archived, false), scopeCondition(scope, "licenses", licenseColumns)))
    .limit(1);
  return rows[0] ?? null;
}

// Every native (non-HubSpot-synced) record needs a synthetic hubspotId so it
// can be targeted by dynamic_associations joins — same local-<uuid>
// convention as contact.repository.ts's create(). Without this, a license
// created here could never be associated with a company.
export async function create(input: CreateLicenseInput): Promise<License> {
  const id = randomUUID();
  await db.insert(license).values({
    id,
    hubspotId: `local-${randomUUID()}`,
    archived: false,
    name: input.name,
    status: input.status,
    customerName: input.customerName,
    partnerName: input.partnerName,
    typeObj: input.typeObj,
    subscription: input.subscription,
    quantity: input.quantity,
    platformCreatedDate: input.platformCreatedDate ? new Date(input.platformCreatedDate) : undefined,
    activationDate: input.activationDate ? new Date(input.activationDate) : undefined,
    expirationDate: input.expirationDate ? new Date(input.expirationDate) : undefined,
    revokeDate: input.revokeDate || undefined,
    licenseGroup: input.licenseGroup,
    module: input.module,
  });
  const rows = await db.select(LICENSE_FIELDS).from(license).where(eq(license.id, id)).limit(1);
  return rows[0];
}

export async function update(id: string, input: UpdateLicenseInput, scope?: RecordAccessScope): Promise<License | null> {
  const where = and(eq(license.id, id), eq(license.archived, false), scopeCondition(scope, "licenses", licenseColumns));
  await db
    .update(license)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.customerName !== undefined ? { customerName: input.customerName } : {}),
      ...(input.partnerName !== undefined ? { partnerName: input.partnerName } : {}),
      ...(input.typeObj !== undefined ? { typeObj: input.typeObj } : {}),
      ...(input.subscription !== undefined ? { subscription: input.subscription } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.activationDate !== undefined
        ? { activationDate: input.activationDate ? new Date(input.activationDate) : null }
        : {}),
      ...(input.expirationDate !== undefined
        ? { expirationDate: input.expirationDate ? new Date(input.expirationDate) : null }
        : {}),
      ...(input.revokeDate !== undefined ? { revokeDate: input.revokeDate || null } : {}),
      ...(input.licenseGroup !== undefined ? { licenseGroup: input.licenseGroup } : {}),
      ...(input.module !== undefined ? { module: input.module } : {}),
      updatedAt: new Date(),
    })
    .where(where);
  const rows = await db.select(LICENSE_FIELDS).from(license).where(where).limit(1);
  return rows[0] ?? null;
}

export async function findAssociatedCompanies(licenseId: string): Promise<AssociatedCompany[]> {
  return db
    .selectDistinct({
      id: company.id,
      name: company.name,
      domain: company.domain,
      website: company.website,
    })
    .from(license)
    .innerJoin(
      dynamicAssociation,
      and(
        eq(dynamicAssociation.fromObjectType, LICENSE_OBJECT_TYPE),
        eq(dynamicAssociation.fromHubspotId, license.hubspotId),
        eq(dynamicAssociation.toObjectType, "companies"),
      ),
    )
    .innerJoin(company, eq(company.hubspotId, dynamicAssociation.toHubspotId))
    .where(and(eq(license.id, licenseId), eq(company.archived, false)));
}

// Soft-archive, matching every other object's remove() in this codebase.
export async function remove(id: string, scope?: RecordAccessScope): Promise<boolean> {
  const [result] = await db
    .update(license)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(license.id, id), scopeCondition(scope, "licenses", licenseColumns)));
  return result.affectedRows > 0;
}

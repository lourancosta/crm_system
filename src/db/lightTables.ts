import { sql } from "drizzle-orm";
import { boolean, datetime, decimal, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

/**
 * Slim projections of very wide dynamic.* tables (600+ columns for contacts).
 * Referencing the fully-reconciled table export from schema.ts in a
 * query-builder chain makes TypeScript's type inference blow past its
 * instantiation-depth limit. These point at the same physical tables but only
 * declare the columns the app actually queries, keeping things type-checkable.
 */
export const contactLite = mysqlTable("contacts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  hubspotId: text("hubspot_id"),
  archived: boolean("archived").notNull().default(false),
  firstname: text("firstname"),
  lastname: text("lastname"),
  email: text("email"),
  phone: text("phone"),
  mobilephone: text("mobilephone"),
  company: text("company"),
  jobtitle: text("jobtitle"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country"),
  website: text("website"),
  lifecyclestage: text("lifecyclestage"),
  hsLeadStatus: text("hs_lead_status"),
  hubspotOwnerId: text("hubspot_owner_id"),
  createdate: datetime("createdate"),
  createdAt: datetime("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: datetime("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const ticketLite = mysqlTable("tickets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  hubspotId: text("hubspot_id"),
  archived: boolean("archived").notNull().default(false),
  subject: text("subject"),
  content: text("content"),
  hsPipeline: text("hs_pipeline"),
  hsPipelineStage: text("hs_pipeline_stage"),
  hsTicketPriority: text("hs_ticket_priority"),
  hsTicketCategory: text("hs_ticket_category"),
  hubspotOwnerId: text("hubspot_owner_id"),
  // Set when a partner/customer portal user creates this ticket directly (not
  // synced from HubSpot) — see dynamic.deals.created_by_user_id for why.
  // Physical column added by a raw migration, not drizzle-kit push (this
  // table isn't in drizzle.config.ts's schema scan — see file header).
  createdByUserId: varchar("created_by_user_id", { length: 36 }),
  createdAt: datetime("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: datetime("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const quoteLite = mysqlTable("quotes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  hubspotId: text("hubspot_id").notNull(),
  archived: boolean("archived").notNull().default(false),
  hsTitle: text("hs_title"),
  hsQuoteNumber: text("hs_quote_number"),
  hsQuoteStatus: text("hs_quote_status"),
  hsQuoteAmount: decimal("hs_quote_amount", { precision: 20, scale: 6 }),
  hsCurrency: text("hs_currency"),
  hsExpirationDate: datetime("hs_expiration_date"),
  // See schema.ts's quote table — derived by crm-migration's sync from
  // HubSpot's independent esign fields, not equivalent to hsQuoteStatus.
  isSigned: boolean("is_signed"),
  signedDate: datetime("signed_date"),
  createdAt: datetime("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: datetime("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const emailLite = mysqlTable("emails", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  hubspotId: text("hubspot_id"),
  archived: boolean("archived").notNull().default(false),
  hsEmailDirection: text("hs_email_direction"),
  hsEmailSubject: text("hs_email_subject"),
  hsBodyPreview: text("hs_body_preview"),
  hsBodyPreviewHtml: text("hs_body_preview_html"),
  // Semicolon-separated when there are multiple recipients — see
  // emailActivity.service.ts::formatEmailParticipants.
  hsEmailFromEmail: text("hs_email_from_email"),
  hsEmailFromFirstname: text("hs_email_from_firstname"),
  hsEmailFromLastname: text("hs_email_from_lastname"),
  hsEmailToEmail: text("hs_email_to_email"),
  hsEmailToFirstname: text("hs_email_to_firstname"),
  hsEmailToLastname: text("hs_email_to_lastname"),
  hsTimestamp: datetime("hs_timestamp"),
  hsLastmodifieddate: datetime("hs_lastmodifieddate"),
  createdAt: datetime("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: datetime("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const noteLite = mysqlTable("notes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  hubspotId: text("hubspot_id"),
  archived: boolean("archived").notNull().default(false),
  hsNoteBody: text("hs_note_body"),
  hsBodyPreview: text("hs_body_preview"),
  hsBodyPreviewHtml: text("hs_body_preview_html"),
  hsTimestamp: datetime("hs_timestamp"),
  hsLastmodifieddate: datetime("hs_lastmodifieddate"),
  createdAt: datetime("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: datetime("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const callLite = mysqlTable("calls", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  hubspotId: text("hubspot_id"),
  archived: boolean("archived").notNull().default(false),
  hsCallBody: text("hs_call_body"),
  hsBodyPreview: text("hs_body_preview"),
  hsBodyPreviewHtml: text("hs_body_preview_html"),
  hsCallTitle: text("hs_call_title"),
  hsCallDirection: text("hs_call_direction"),
  hsCallDisposition: text("hs_call_disposition"),
  hsCallDuration: decimal("hs_call_duration", { precision: 20, scale: 6 }),
  hsTimestamp: datetime("hs_timestamp"),
  hsLastmodifieddate: datetime("hs_lastmodifieddate"),
  createdAt: datetime("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: datetime("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const meetingLite = mysqlTable("meetings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  hubspotId: text("hubspot_id"),
  archived: boolean("archived").notNull().default(false),
  hsMeetingBody: text("hs_meeting_body"),
  hsBodyPreview: text("hs_body_preview"),
  hsBodyPreviewHtml: text("hs_body_preview_html"),
  hsMeetingTitle: text("hs_meeting_title"),
  hsMeetingOutcome: text("hs_meeting_outcome"),
  hsMeetingLocation: text("hs_meeting_location"),
  hsMeetingStartTime: datetime("hs_meeting_start_time"),
  hsMeetingEndTime: datetime("hs_meeting_end_time"),
  hsTimestamp: datetime("hs_timestamp"),
  hsLastmodifieddate: datetime("hs_lastmodifieddate"),
  createdAt: datetime("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: datetime("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const creditMemoLite = mysqlTable("credit_memo", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  hubspotId: text("hubspot_id"),
  archived: boolean("archived").notNull().default(false),
  hsNumber: text("hs_number"),
  hsCreditMemoStatus: text("hs_credit_memo_status"),
  hsCreditMemoDate: datetime("hs_credit_memo_date"),
  hsCreditMemoSource: text("hs_credit_memo_source"),
  hubspotOwnerId: text("hubspot_owner_id"),
  hsAmountCredited: decimal("hs_amount_credited", { precision: 20, scale: 6 }),
  hsAmountRemaining: decimal("hs_amount_remaining", { precision: 20, scale: 6 }),
  hsCurrency: text("hs_currency"),
  hsComments: text("hs_comments"),
  hsSubtotal: decimal("hs_subtotal", { precision: 20, scale: 6 }),
  hsDiscountsTotal: decimal("hs_discounts_total", { precision: 20, scale: 6 }),
  hsFeesTotal: decimal("hs_fees_total", { precision: 20, scale: 6 }),
  hsTaxesTotal: decimal("hs_taxes_total", { precision: 20, scale: 6 }),
  createdAt: datetime("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: datetime("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});


import { and, eq, isNotNull, isNull, lte, notInArray } from "drizzle-orm";
import { db } from "../../db/client";
import { invoice, reminderLog } from "../../db/schema";

const OBJECT_TYPE = "invoices";

export type InvoiceDueForReminder = {
  id: string;
  hsNumber: string | null;
  hsInvoiceStatus: string | null;
  typeObj: string | null;
  tenant: string | null;
  mspLevel: string | null;
  hsInvoiceDate: Date | null;
  hsDueDate: Date | null;
  hsBalanceDue: string | null;
  hsAmountPaid: string | null;
  hsAmountBilled: string | null;
  hsCurrency: string | null;
  hsBillingFrequencyType: string | null;
  hsInvoiceLatestCompanyName: string | null;
  hsInvoiceLatestContactEmail: string | null;
  hsInvoiceLatestContactFirstname: string | null;
  hsInvoiceLatestContactLastname: string | null;
  hsRecipientCompanyAddress: string | null;
  hsRecipientCompanyCity: string | null;
  hsRecipientCompanyState: string | null;
  hsRecipientCompanyCountry: string | null;
  hsRecipientCompanyZip: string | null;
};

export async function findDueForRule(ruleId: string, dueBefore: Date): Promise<InvoiceDueForReminder[]> {
  return db
    .select({
      id: invoice.id,
      hsNumber: invoice.hsNumber,
      hsInvoiceStatus: invoice.hsInvoiceStatus,
      typeObj: invoice.typeObj,
      tenant: invoice.tenant,
      mspLevel: invoice.mspLevel,
      hsInvoiceDate: invoice.hsInvoiceDate,
      hsDueDate: invoice.hsDueDate,
      hsBalanceDue: invoice.hsBalanceDue,
      hsAmountPaid: invoice.hsAmountPaid,
      hsAmountBilled: invoice.hsAmountBilled,
      hsCurrency: invoice.hsCurrency,
      hsBillingFrequencyType: invoice.hsBillingFrequencyType,
      hsInvoiceLatestCompanyName: invoice.hsInvoiceLatestCompanyName,
      hsInvoiceLatestContactEmail: invoice.hsInvoiceLatestContactEmail,
      hsInvoiceLatestContactFirstname: invoice.hsInvoiceLatestContactFirstname,
      hsInvoiceLatestContactLastname: invoice.hsInvoiceLatestContactLastname,
      hsRecipientCompanyAddress: invoice.hsRecipientCompanyAddress,
      hsRecipientCompanyCity: invoice.hsRecipientCompanyCity,
      hsRecipientCompanyState: invoice.hsRecipientCompanyState,
      hsRecipientCompanyCountry: invoice.hsRecipientCompanyCountry,
      hsRecipientCompanyZip: invoice.hsRecipientCompanyZip,
    })
    .from(invoice)
    .leftJoin(
      reminderLog,
      and(
        eq(reminderLog.objectType, OBJECT_TYPE),
        eq(reminderLog.objectId, invoice.id),
        eq(reminderLog.ruleId, ruleId),
      ),
    )
    .where(
      and(
        eq(invoice.archived, false),
        isNotNull(invoice.hsDueDate),
        notInArray(invoice.hsInvoiceStatus, ["paid", "voided"]),
        lte(invoice.hsDueDate, dueBefore),
        isNull(reminderLog.id),
      ),
    );
}

export async function logReminderSent(invoiceId: string, ruleId: string, sentAt: Date): Promise<void> {
  await db.insert(reminderLog).values({ objectType: OBJECT_TYPE, objectId: invoiceId, ruleId, sentAt });
}

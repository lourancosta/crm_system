import { sendEmail } from "../../lib/email";
import { getAppBaseUrl } from "../auth/auth.service";
import { findAssociatedContacts } from "../invoices/invoice.repository";
import { findAccountForFeature } from "../emailAccounts/emailAccount.repository";
import * as emailTemplateRepository from "../emailTemplates/emailTemplate.repository";
import * as invoiceReminderRepository from "./invoiceReminder.repository";
import type { InvoiceDueForReminder } from "./invoiceReminder.repository";
import * as reminderRuleRepository from "./reminderRule.repository";
import type { ReminderRule } from "./reminderRule.types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function resolveRecipients(
  invoice: Pick<InvoiceDueForReminder, "hsInvoiceLatestContactEmail">,
  associatedContacts: { email: string | null }[],
): string[] {
  const emails = associatedContacts
    .map((contact) => contact.email)
    .filter((email): email is string => Boolean(email));

  if (emails.length > 0) {
    return [...new Set(emails)];
  }

  return invoice.hsInvoiceLatestContactEmail ? [invoice.hsInvoiceLatestContactEmail] : [];
}

export function renderTemplate(template: string, invoice: InvoiceDueForReminder, now: Date): string {
  const dueDate = invoice.hsDueDate?.toLocaleDateString() ?? "soon";
  const invoiceDate = invoice.hsInvoiceDate?.toLocaleDateString() ?? "";
  const amount = [invoice.hsBalanceDue, invoice.hsCurrency].filter(Boolean).join(" ");
  const amountPaid = [invoice.hsAmountPaid, invoice.hsCurrency].filter(Boolean).join(" ");
  const amountBilled = [invoice.hsAmountBilled, invoice.hsCurrency].filter(Boolean).join(" ");
  const daysUntilDue = invoice.hsDueDate
    ? Math.round((invoice.hsDueDate.getTime() - now.getTime()) / MS_PER_DAY)
    : null;

  const tokens: Record<string, string> = {
    invoiceNumber: invoice.hsNumber ?? invoice.id,
    invoiceStatus: invoice.hsInvoiceStatus ?? "",
    invoiceType: invoice.typeObj ?? "",
    invoiceDate,
    tenant: invoice.tenant ?? "",
    mspLevel: invoice.mspLevel ?? "",
    companyName: invoice.hsInvoiceLatestCompanyName ?? "",
    amount: amount || "—",
    amountPaid: amountPaid || "—",
    amountBilled: amountBilled || "—",
    billingFrequency: invoice.hsBillingFrequencyType ?? "",
    dueDate,
    daysUntilDue: daysUntilDue !== null ? String(daysUntilDue) : "—",
    contactFirstName: invoice.hsInvoiceLatestContactFirstname ?? "",
    contactLastName: invoice.hsInvoiceLatestContactLastname ?? "",
    contactEmail: invoice.hsInvoiceLatestContactEmail ?? "",
    recipientAddress: invoice.hsRecipientCompanyAddress ?? "",
    recipientCity: invoice.hsRecipientCompanyCity ?? "",
    recipientState: invoice.hsRecipientCompanyState ?? "",
    recipientCountry: invoice.hsRecipientCompanyCountry ?? "",
    recipientZip: invoice.hsRecipientCompanyZip ?? "",
    invoicePreviewUrl: `${getAppBaseUrl()}/invoices/${invoice.id}/preview`,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => tokens[key] ?? "");
}

export function buildReminderEmail(
  content: { subject: string; body: string },
  invoice: InvoiceDueForReminder,
  now: Date = new Date(),
): { subject: string; html: string } {
  return {
    subject: renderTemplate(content.subject, invoice, now),
    html: renderTemplate(content.body, invoice, now),
  };
}

// Rules go through emailTemplateId going forward; subjectTemplate/bodyTemplate
// are only read as a fallback for rules created before templates existed.
async function resolveRuleContent(rule: ReminderRule): Promise<{ subject: string; body: string } | null> {
  if (rule.emailTemplateId) {
    const template = await emailTemplateRepository.findById(rule.emailTemplateId);
    if (template) return { subject: template.subject, body: template.htmlBody };
  }
  if (rule.subjectTemplate && rule.bodyTemplate) {
    return { subject: rule.subjectTemplate, body: rule.bodyTemplate };
  }
  return null;
}

export type ReminderRunResult = {
  sent: number;
  skipped: number;
  failed: number;
};

export async function runInvoiceDueReminders(): Promise<ReminderRunResult> {
  const now = new Date();
  const rules = await reminderRuleRepository.findEnabled("invoices");

  const result: ReminderRunResult = { sent: 0, skipped: 0, failed: 0 };

  if (rules.length > 0 && !(await findAccountForFeature("invoice_reminders"))) {
    console.warn('Invoice reminders skipped: no email account assigned in Settings > Email Accounts.');
    return result;
  }

  for (const rule of rules) {
    const content = await resolveRuleContent(rule);
    if (!content) {
      console.error(`Reminder rule "${rule.label}" has no email template assigned — skipping.`);
      continue;
    }

    const dueBefore = new Date(now.getTime() + rule.daysBeforeTrigger * MS_PER_DAY);
    const dueInvoices = await invoiceReminderRepository.findDueForRule(rule.id, dueBefore);

    for (const invoice of dueInvoices) {
      try {
        const associatedContacts = await findAssociatedContacts(invoice.id);
        const recipients = resolveRecipients(invoice, associatedContacts);

        if (recipients.length === 0) {
          result.skipped += 1;
          continue;
        }

        const { subject, html } = buildReminderEmail(content, invoice, now);
        await sendEmail({ feature: "invoice_reminders", to: recipients, subject, html });
        await invoiceReminderRepository.logReminderSent(invoice.id, rule.id, now);
        result.sent += 1;
      } catch (error) {
        console.error(`Failed to send invoice reminder (rule "${rule.label}") for invoice ${invoice.id}`, error);
        result.failed += 1;
      }
    }
  }

  return result;
}

import assert from "node:assert/strict";
import test from "node:test";
import { buildReminderEmail, renderTemplate, resolveRecipients } from "./invoiceReminder.service";
import type { InvoiceDueForReminder } from "./invoiceReminder.repository";

const baseInvoice: InvoiceDueForReminder = {
  id: "11111111-1111-1111-1111-111111111111",
  hsNumber: "INV-100",
  hsInvoiceStatus: "open",
  typeObj: "invoice",
  tenant: "acme",
  mspLevel: "gold",
  hsInvoiceDate: new Date("2026-07-01T00:00:00Z"),
  hsDueDate: new Date("2026-07-15T00:00:00Z"),
  hsBalanceDue: "500.00",
  hsAmountPaid: "0.00",
  hsAmountBilled: "500.00",
  hsCurrency: "USD",
  hsBillingFrequencyType: "monthly",
  hsInvoiceLatestCompanyName: "Acme Co",
  hsInvoiceLatestContactEmail: "fallback@acme.test",
  hsInvoiceLatestContactFirstname: "Jamie",
  hsInvoiceLatestContactLastname: "Smith",
  hsRecipientCompanyAddress: "123 Main St",
  hsRecipientCompanyCity: "Springfield",
  hsRecipientCompanyState: "IL",
  hsRecipientCompanyCountry: "USA",
  hsRecipientCompanyZip: "62701",
};

test("resolveRecipients prefers associated contact emails and dedupes them", () => {
  const recipients = resolveRecipients(baseInvoice, [
    { email: "a@acme.test" },
    { email: "b@acme.test" },
    { email: "a@acme.test" },
    { email: null },
  ]);

  assert.deepEqual(recipients, ["a@acme.test", "b@acme.test"]);
});

test("resolveRecipients falls back to the invoice's latest contact email when no associated contacts have one", () => {
  const recipients = resolveRecipients(baseInvoice, [{ email: null }]);

  assert.deepEqual(recipients, ["fallback@acme.test"]);
});

test("resolveRecipients returns an empty list when there is no email anywhere", () => {
  const recipients = resolveRecipients({ ...baseInvoice, hsInvoiceLatestContactEmail: null }, []);

  assert.deepEqual(recipients, []);
});

test("renderTemplate interpolates invoice tokens", () => {
  const now = new Date("2026-07-10T00:00:00Z");
  const rendered = renderTemplate(
    "Invoice {{invoiceNumber}} for {{companyName}} - {{amount}} due {{dueDate}} in {{daysUntilDue}} days",
    baseInvoice,
    now,
  );

  assert.match(rendered, /INV-100/);
  assert.match(rendered, /Acme Co/);
  assert.match(rendered, /500\.00 USD/);
  assert.match(rendered, / 5 days/);
});

test("renderTemplate leaves unknown tokens blank", () => {
  const rendered = renderTemplate("Hello {{unknownToken}}!", baseInvoice, new Date());
  assert.equal(rendered, "Hello !");
});

test("buildReminderEmail renders both subject and body templates from the rule", () => {
  const content = {
    subject: "Invoice {{invoiceNumber}} is due {{dueDate}}",
    body: "<p>{{companyName}} owes {{amount}}</p>",
  };

  const { subject, html } = buildReminderEmail(content, baseInvoice, new Date("2026-07-10T00:00:00Z"));

  assert.match(subject, /INV-100/);
  assert.match(html, /Acme Co/);
  assert.match(html, /500\.00 USD/);
});

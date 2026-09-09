import type { EmailTemplateObject } from '../../shared/types/index';

export type EmailToken = { token: string; label: string };

// What each object type actually has available to substitute at send time.
// Keep in sync with each feature's own renderer (e.g.
// src/modules/notifications/invoiceReminder.service.ts's renderTemplate for
// 'invoices') — this only drives the editor's "insert token" palette.
export const EMAIL_TEMPLATE_TOKENS: Record<EmailTemplateObject, EmailToken[]> = {
  invoices: [
    { token: 'invoiceNumber', label: 'Number' },
    { token: 'invoiceStatus', label: 'Status' },
    { token: 'invoiceType', label: 'Type' },
    { token: 'invoiceDate', label: 'Date' },
    { token: 'dueDate', label: 'Due date' },
    { token: 'daysUntilDue', label: 'Days until due' },
    { token: 'amount', label: 'Amount due' },
    { token: 'amountPaid', label: 'Amount paid' },
    { token: 'amountBilled', label: 'Amount billed' },
    { token: 'billingFrequency', label: 'Billing frequency' },
    { token: 'tenant', label: 'Tenant' },
    { token: 'mspLevel', label: 'MSP level' },
    { token: 'companyName', label: 'Company name' },
    { token: 'contactFirstName', label: 'Contact first name' },
    { token: 'contactLastName', label: 'Contact last name' },
    { token: 'contactEmail', label: 'Contact email' },
    { token: 'recipientAddress', label: 'Billing address' },
    { token: 'recipientCity', label: 'Billing city' },
    { token: 'recipientState', label: 'Billing state' },
    { token: 'recipientCountry', label: 'Billing country' },
    { token: 'recipientZip', label: 'Billing zip' },
    { token: 'invoicePreviewUrl', label: 'Preview link (use as a button URL)' },
  ],
  companies: [
    { token: 'companyName', label: 'Name' },
    { token: 'companyDomain', label: 'Domain' },
    { token: 'companyWebsite', label: 'Website' },
    { token: 'companyPhone', label: 'Phone' },
    { token: 'companyDescription', label: 'Description' },
    { token: 'companyIndustry', label: 'Industry' },
    { token: 'companyLifecycleStage', label: 'Lifecycle stage' },
    { token: 'companyAddress', label: 'Address' },
    { token: 'companyCity', label: 'City' },
    { token: 'companyState', label: 'State' },
    { token: 'companyCountry', label: 'Country' },
    { token: 'companyZip', label: 'Zip' },
    { token: 'companyEmployeeCount', label: 'Employee count' },
    { token: 'companyAnnualRevenue', label: 'Annual revenue' },
    { token: 'companyCreatedDate', label: 'Created date' },
  ],
  contacts: [
    { token: 'contactFirstName', label: 'First name' },
    { token: 'contactLastName', label: 'Last name' },
    { token: 'contactEmail', label: 'Email' },
    { token: 'contactPhone', label: 'Phone' },
    { token: 'contactMobilePhone', label: 'Mobile phone' },
    { token: 'contactCompany', label: 'Company name' },
    { token: 'contactJobTitle', label: 'Job title' },
    { token: 'contactAddress', label: 'Address' },
    { token: 'contactCity', label: 'City' },
    { token: 'contactState', label: 'State' },
    { token: 'contactZip', label: 'Zip' },
    { token: 'contactCountry', label: 'Country' },
    { token: 'contactWebsite', label: 'Website' },
    { token: 'contactLifecycleStage', label: 'Lifecycle stage' },
    { token: 'contactLeadStatus', label: 'Lead status' },
    { token: 'contactCreatedDate', label: 'Created date' },
  ],
  deals: [
    { token: 'dealName', label: 'Name' },
    { token: 'dealAmount', label: 'Amount' },
    { token: 'dealStage', label: 'Stage' },
    { token: 'dealPipeline', label: 'Pipeline' },
    { token: 'dealCloseDate', label: 'Close date' },
    { token: 'dealModules', label: 'Modules' },
    { token: 'dealOwner', label: 'Owner' },
    { token: 'dealCreatedDate', label: 'Created date' },
  ],
};

const OBJECT_LABELS: Record<EmailTemplateObject, string> = {
  contacts: 'Contact',
  companies: 'Company',
  deals: 'Deal',
  invoices: 'Invoice',
};

export function tokensForObjects(objects: EmailTemplateObject[]): EmailToken[] {
  const result: EmailToken[] = [];
  for (const object of objects) {
    for (const t of EMAIL_TEMPLATE_TOKENS[object] ?? []) {
      result.push({ token: t.token, label: `${OBJECT_LABELS[object]}: ${t.label}` });
    }
  }
  return result;
}

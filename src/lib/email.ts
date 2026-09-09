import nodemailer from "nodemailer";
import { decrypt } from "./encryption";
import * as emailAccountRepository from "../modules/emailAccounts/emailAccount.repository";
import type { EmailFeature } from "../modules/emailAccounts/emailAccount.types";

export type SendEmailInput = {
  feature: EmailFeature;
  to: string[];
  subject: string;
  html: string;
};

export async function sendEmail({ feature, to, subject, html }: SendEmailInput): Promise<void> {
  const account = await emailAccountRepository.findAccountForFeature(feature);
  if (!account) {
    throw new Error(`No email account is configured for "${feature}" — set one up in Settings > Email Accounts.`);
  }

  const testOverride = process.env.TEST_EMAIL_OVERRIDE;
  const recipients = testOverride ? [testOverride] : to;
  const subjectLine = testOverride ? `[TEST - real recipients: ${to.join(", ")}] ${subject}` : subject;

  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: false,
    requireTLS: true,
    auth: { user: account.smtpUser, pass: decrypt(account.smtpPasswordEncrypted) },
  });

  const from = account.fromName ? `"${account.fromName}" <${account.fromEmail}>` : account.fromEmail;
  await transporter.sendMail({ from, to: recipients, subject: subjectLine, html });
}

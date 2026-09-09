// Extend this list when a new feature needs to send its own email.
export const EMAIL_FEATURES = [
  'invoice_reminders',
  'password_reset',
  'user_invite',
  'quote_signature_request',
  'quote_countersign_request',
] as const;
export type EmailFeature = (typeof EMAIL_FEATURES)[number];

export type EmailAccount = {
  id: string;
  name: string;
  fromName: string | null;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  createdAt: Date;
  updatedAt: Date;
};

// Internal-only shape (includes the encrypted secret) — used exclusively by
// src/lib/email.ts to build a transporter. Never serialize this to the API.
export type EmailAccountWithSecret = EmailAccount & { smtpPasswordEncrypted: string };

export type CreateEmailAccountInput = {
  name: string;
  fromName?: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
};

export type UpdateEmailAccountInput = Partial<Omit<CreateEmailAccountInput, 'smtpPassword'>> & {
  smtpPassword?: string;
};

export type FeatureAssignment = {
  feature: EmailFeature;
  emailAccountId: string | null;
};

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
  createdAt: string;
  updatedAt: string;
};

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

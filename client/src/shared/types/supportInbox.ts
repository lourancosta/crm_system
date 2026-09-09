export const SUPPORT_INBOX_AUTH_TYPES = ['password', 'microsoft_oauth'] as const;
export type SupportInboxAuthType = (typeof SUPPORT_INBOX_AUTH_TYPES)[number];

export type SupportInbox = {
  id: string;
  name: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  authType: SupportInboxAuthType;
  msTenantId: string | null;
  msClientId: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  folder: string;
  pipelineId: string;
  defaultStageId: string;
  lastUid: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupportInboxInput = {
  name: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  authType: SupportInboxAuthType;
  imapPassword?: string;
  msTenantId?: string;
  msClientId?: string;
  msClientSecret?: string;
  smtpHost?: string;
  smtpPort?: number;
  folder: string;
  pipelineId: string;
  defaultStageId: string;
  enabled: boolean;
};

export type UpdateSupportInboxInput = Partial<Omit<CreateSupportInboxInput, 'imapPassword' | 'msClientSecret'>> & {
  imapPassword?: string;
  msClientSecret?: string;
};

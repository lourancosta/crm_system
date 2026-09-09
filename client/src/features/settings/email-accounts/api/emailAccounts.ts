import { del, get, post, put } from '../../../../shared/api/client';
import type {
  CreateEmailAccountInput,
  EmailAccount,
  EmailFeature,
  FeatureAssignment,
  UpdateEmailAccountInput,
} from '../../../../shared/types/index';

export const emailAccountsApi = {
  list: () => get<EmailAccount[]>('/email-accounts'),
  create: (input: CreateEmailAccountInput) => post<EmailAccount>('/email-accounts', input),
  update: (id: string, input: UpdateEmailAccountInput) => put<EmailAccount>(`/email-accounts/${id}`, input),
  delete: (id: string) => del(`/email-accounts/${id}`),

  getFeatureAssignments: () => get<FeatureAssignment[]>('/email-accounts/feature-settings'),
  setFeatureAssignment: (feature: EmailFeature, emailAccountId: string | null) =>
    put(`/email-accounts/feature-settings/${feature}`, { emailAccountId }),
};

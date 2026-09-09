import { get, put } from '../../../../shared/api/client';

export type GoogleStorageSettings = {
  projectId: string | null;
  publicBucket: string | null;
  privateBucket: string | null;
  publicUrl: string | null;
  hasServiceAccountKey: boolean;
};

export type UpdateGoogleStorageSettingsInput = {
  projectId: string | null;
  publicBucket: string | null;
  privateBucket: string | null;
  publicUrl: string | null;
  serviceAccountKey?: string;
};

export const googleStorageSettingsApi = {
  get: () => get<GoogleStorageSettings>('/google-storage-settings'),
  update: (data: UpdateGoogleStorageSettingsInput) =>
    put<GoogleStorageSettings>('/google-storage-settings', data),
};

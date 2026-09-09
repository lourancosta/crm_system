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

// Internal-only: decrypted credentials for src/lib/storage.ts. `credentials`
// is null if no service-account key has been configured yet.
export type GoogleStorageCredentials = {
  projectId: string | null;
  publicBucket: string | null;
  privateBucket: string | null;
  publicUrl: string | null;
  credentials: Record<string, unknown> | null;
};

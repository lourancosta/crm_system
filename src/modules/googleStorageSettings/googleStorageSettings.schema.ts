import { z } from 'zod';

export const updateGoogleStorageSettingsSchema = z.object({
  projectId: z.string().nullable(),
  publicBucket: z.string().nullable(),
  privateBucket: z.string().nullable(),
  publicUrl: z.string().nullable(),
  serviceAccountKey: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const parsed = JSON.parse(value);
          return typeof parsed === 'object' && parsed !== null && 'client_email' in parsed && 'private_key' in parsed;
        } catch {
          return false;
        }
      },
      { message: 'Service account key must be a valid JSON key file with client_email and private_key' },
    ),
});

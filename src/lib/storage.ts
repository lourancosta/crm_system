import { Storage } from "@google-cloud/storage";
import { getGoogleStorageCredentials } from "../modules/googleStorageSettings/googleStorageSettings.repository";

// File storage for the whole app, backed by two GCS buckets:
// - "public": world-readable, for content servable to anonymous visitors
//   (customer-facing KB articles, outbound email template assets).
// - "private": no public IAM grant - objects are only reachable through an
//   authenticated app route that streams bytes after checking the caller's
//   session (see kb.upload.ts's getKbMedia for the pattern).
// Each caller namespaces its own objects with a key prefix (e.g. "knowledge-base/").
//
// Config (project id, bucket names, public URL) and the service-account
// credential live in the google_storage_settings DB table (Settings > File
// Storage), not env vars - fetched and decrypted fresh on every call so a
// credential rotated through the UI takes effect without a server restart.

function notConfigured(field: string): Error & { statusCode?: number } {
  const error = new Error(`File storage is not configured (missing ${field})`) as Error & { statusCode?: number };
  error.statusCode = 500;
  return error;
}

export type BucketTarget = "public" | "private";

// No service-account key configured falls back to Application Default
// Credentials (e.g. the service account attached to the Cloud Run/GCE
// instance) - same as the original env-var setup, where
// GOOGLE_APPLICATION_CREDENTIALS was optional and unset in production.
async function getStorageContext() {
  const settings = await getGoogleStorageCredentials();
  const storage = new Storage({
    projectId: settings.projectId ?? undefined,
    ...(settings.credentials ? { credentials: settings.credentials } : {}),
  });
  return { storage, ...settings };
}

function getBucketName(settings: { publicBucket: string | null; privateBucket: string | null }, target: BucketTarget): string {
  const bucket = target === "public" ? settings.publicBucket : settings.privateBucket;
  if (!bucket) throw notConfigured(target === "public" ? "public bucket" : "private bucket");
  return bucket;
}

// Returns the public URL for a "public" upload, or null for a "private" one -
// private objects have no stable public URL, callers must serve them through
// their own authenticated route instead.
export async function uploadFile(
  target: BucketTarget,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string | null> {
  const { storage, ...settings } = await getStorageContext();
  const bucketName = getBucketName(settings, target);
  await storage.bucket(bucketName).file(key).save(body, { contentType, resumable: false });

  if (target === "private") return null;

  const publicBaseUrl = settings.publicUrl ?? `https://storage.googleapis.com/${bucketName}`;
  return `${publicBaseUrl}/${key}`;
}

export async function getPrivateFile(key: string) {
  const { storage, ...settings } = await getStorageContext();
  return storage.bucket(getBucketName(settings, "private")).file(key);
}

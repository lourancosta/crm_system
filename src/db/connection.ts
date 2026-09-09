const requiredDatabaseKeys = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'] as const;

type DatabaseKey = (typeof requiredDatabaseKeys)[number];

// DB_CONNECTION (e.g. "mysql") is part of the org-wide env var convention
// but never read here — this app is MySQL-only, hardcoded via the
// `mysql://` scheme below, so the value is accepted (present in .env)
// without needing validation.

function isSet(value: string | undefined): value is string {
  return value !== undefined && value !== '';
}

function hasDatabaseParts(env: NodeJS.ProcessEnv): boolean {
  return requiredDatabaseKeys.some((key) => isSet(env[key])) || isSet(env.DB_PORT);
}

function getMissingDatabaseKeys(env: NodeJS.ProcessEnv): DatabaseKey[] {
  return requiredDatabaseKeys.filter((key) => !isSet(env[key]));
}

function buildUrl(env: NodeJS.ProcessEnv, host: string): string {
  const url = new URL('mysql://localhost');
  url.hostname = host;
  url.port = env.DB_PORT || '3306';
  url.username = env.DB_USERNAME!;
  url.password = env.DB_PASSWORD!;
  url.pathname = `/${env.DB_DATABASE!}`;
  return url.toString();
}

export function getDatabaseConnectionString(env: NodeJS.ProcessEnv = process.env): string {
  if (hasDatabaseParts(env)) {
    const missingKeys = getMissingDatabaseKeys(env);

    if (missingKeys.length > 0) {
      throw new Error(
        `Database configuration is incomplete. Missing: ${missingKeys.join(', ')}. ` +
          'Set all DB_* variables or provide DATABASE_URL.',
      );
    }

    return buildUrl(env, env.DB_HOST!);
  }

  if (isSet(env.DATABASE_URL)) {
    return env.DATABASE_URL;
  }

  throw new Error(
    'Database configuration is missing. Set DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE, optionally DB_PORT, or DATABASE_URL.',
  );
}

// Reader (replica) connection — DB_HOST_READ is optional and falls back to
// the writer host (DB_HOST) when unset, so a single-instance setup (e.g.
// local dev, which only runs one MySQL container) works unchanged. When on
// the DATABASE_URL fallback path there's no separate reader concept, so the
// same URL is reused for both.
export function getReaderConnectionString(env: NodeJS.ProcessEnv = process.env): string {
  if (hasDatabaseParts(env)) {
    const missingKeys = getMissingDatabaseKeys(env);

    if (missingKeys.length > 0) {
      throw new Error(
        `Database configuration is incomplete. Missing: ${missingKeys.join(', ')}. ` +
          'Set all DB_* variables or provide DATABASE_URL.',
      );
    }

    return buildUrl(env, env.DB_HOST_READ || env.DB_HOST!);
  }

  if (isSet(env.DATABASE_URL)) {
    return env.DATABASE_URL;
  }

  throw new Error(
    'Database configuration is missing. Set DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE, optionally DB_PORT, or DATABASE_URL.',
  );
}

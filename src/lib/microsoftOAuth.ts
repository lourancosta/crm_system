export type MicrosoftOAuthCredentials = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
};

// Client-credentials (app-only) OAuth2 flow for a Microsoft 365 mailbox,
// scoped to IMAP access via XOAUTH2. A single short HTTP call - no MSAL SDK
// dependency needed since this is the only OAuth flow the app uses. Fetches
// a fresh token on every call by design (see src/modules/supportInbox/
// inboundEmail.poller.ts) rather than caching, since polling only happens
// every few minutes.
export async function getAccessToken(credentials: MicrosoftOAuthCredentials): Promise<string> {
  const response = await fetch(`https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      scope: "https://outlook.office365.com/.default",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Microsoft OAuth token request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Microsoft OAuth token response did not include an access_token");
  }
  return data.access_token;
}

import assert from "node:assert/strict";
import test from "node:test";
import { getAccessToken } from "./microsoftOAuth";

const CREDENTIALS = { tenantId: "tenant-1", clientId: "client-1", clientSecret: "secret-1" };

test("getAccessToken posts client-credentials grant to the tenant token endpoint and returns the token", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl: string | undefined;
  let capturedBody: string | undefined;

  globalThis.fetch = (async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedBody = init.body?.toString();
    return {
      ok: true,
      json: async () => ({ access_token: "fake-token-123" }),
    } as Response;
  }) as typeof fetch;

  try {
    const token = await getAccessToken(CREDENTIALS);
    assert.equal(token, "fake-token-123");
    assert.equal(capturedUrl, "https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token");
    const params = new URLSearchParams(capturedBody);
    assert.equal(params.get("grant_type"), "client_credentials");
    assert.equal(params.get("client_id"), "client-1");
    assert.equal(params.get("client_secret"), "secret-1");
    assert.equal(params.get("scope"), "https://outlook.office365.com/.default");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAccessToken throws a clear error on a non-OK response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: false,
      status: 401,
      text: async () => "invalid_client",
    }) as Response) as typeof fetch;

  try {
    await assert.rejects(() => getAccessToken(CREDENTIALS), /401/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAccessToken throws if the response has no access_token", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({}),
    }) as Response) as typeof fetch;

  try {
    await assert.rejects(() => getAccessToken(CREDENTIALS), /access_token/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// src/salesforce/auth.ts

/**
 * Salesforce Client Credentials token response shape
 */
export type SfClientCredentialsToken = {
  access_token: string;
  instance_url: string;
  token_type?: string;
  scope?: string;
  issued_at?: string;
  signature?: string;
  // Some orgs include expires_in; if absent, assume ~10m
  expires_in?: number;
};

type TokenCache = {
  token: SfClientCredentialsToken;
  // epoch seconds when token should be treated as expired
  exp: number;
};

let cache: TokenCache | null = null;

/**
 * Fetches (and caches) a Salesforce access token via the OAuth2 Client Credentials flow.
 * Requires an External Client App (or Connected App with CC enabled).
 *
 * ENV VARS:
 *  - SF_LOGIN_URL     (e.g., https://login.salesforce.com or your My Domain)
 *  - SF_CLIENT_ID
 *  - SF_CLIENT_SECRET
 */
export async function getClientCredentialsToken(): Promise<SfClientCredentialsToken> {
  const loginUrl = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';
  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing SF_CLIENT_ID or SF_CLIENT_SECRET');
  }

  // Reuse cached token if it has >60s left
  const now = Math.floor(Date.now() / 1000);
  if (cache && cache.exp - now > 60) {
    return cache.token;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const resp = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!resp.ok) {
    const errText = await safeReadText(resp);
    throw new Error(
      `SF token error: ${resp.status} ${resp.statusText}${errText ? ` - ${errText}` : ''}`
    );
  }

  const token = (await resp.json()) as SfClientCredentialsToken;

  // Compute expiry: use server hint if present, else assume ~10 minutes
  const ttl = typeof token.expires_in === 'number' ? token.expires_in : 600; // seconds
  cache = {
    token,
    // Add a small safety buffer (30s)
    exp: now + Math.max(60, ttl - 30),
  };

  return token;
}

async function safeReadText(r: Response): Promise<string> {
  try {
    const t = await r.text();
    return (t || '').slice(0, 2000); // avoid huge logs
  } catch {
    return '';
  }
}

// salesforce/auth.ts

export type SfClientCredentialsToken = {
  access_token: string;
  instance_url: string;
  token_type?: string;
  scope?: string;
  issued_at?: string;
  signature?: string;
  expires_in?: number; // seconds
};

let cache: { token: SfClientCredentialsToken; exp: number } | null = null;
/**
 * Single-flight guard so concurrent requests don't all fetch a token at once.
 */
let inflight: Promise<SfClientCredentialsToken> | null = null;

/**
 * Fetch (and cache) a Salesforce client-credentials token.
 * - Keeps token server-side only
 * - Reuses cached token until ~30s before expiry
 * - Accepts { forceRefresh: true } to bust cache (e.g., after a 401)
 */
export async function getClientCredentialsToken(
  opts: { forceRefresh?: boolean } = {}
): Promise<SfClientCredentialsToken> {
  const loginUrl = process.env.SF_LOGIN_URL || "https://login.salesforce.com";
  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing SF_CLIENT_ID or SF_CLIENT_SECRET");
  }

  // Invalidate cache if requested
  if (opts.forceRefresh) {
    cache = null;
  }

  const now = Math.floor(Date.now() / 1000);

  // Serve from cache if still fresh (keep 60s buffer)
  if (cache && cache.exp - now > 60) {
    return cache.token;
  }

  // If another request is already fetching a token, await it
  if (inflight) {
    return inflight;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  inflight = (async () => {
    let resp: Response;
    try {
      resp = await fetch(`${loginUrl}/services/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    } catch (e: unknown) {
      inflight = null;
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`SF token network error: ${msg}`);
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      inflight = null;
      // Avoid logging secrets; include only status + first chunk of body.
      throw new Error(`SF token error: ${resp.status} ${text.slice(0, 500)}`);
    }

    const token = (await resp.json()) as SfClientCredentialsToken;

    // Compute expiry with a small buffer so we refresh proactively
    const now2 = Math.floor(Date.now() / 1000);
    const ttl = typeof token.expires_in === "number" ? token.expires_in : 600; // default 10m
    const safeTtl = Math.max(60, ttl - 30); // at least 60s, buffer 30s
    cache = { token, exp: now2 + safeTtl };

    inflight = null;
    return token;
  })();

  return inflight;
}

/**
 * Manually clear the cached token (optional helper).
 * Useful if you want to force a refresh outside of getClientCredentialsToken({ forceRefresh: true }).
 */
export function clearSfTokenCache(): void {
  cache = null;
}



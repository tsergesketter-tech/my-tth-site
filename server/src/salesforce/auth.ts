export type SfClientCredentialsToken = {
  access_token: string;
  instance_url: string;
  token_type?: string;
  scope?: string;
  issued_at?: string;
  signature?: string;
  expires_in?: number;
};

let cache: { token: SfClientCredentialsToken; exp: number } | null = null;

export async function getClientCredentialsToken(): Promise<SfClientCredentialsToken> {
  const loginUrl = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';
  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('Missing SF_CLIENT_ID or SF_CLIENT_SECRET');
    throw new Error('Missing SF_CLIENT_ID or SF_CLIENT_SECRET');
  }

  const now = Math.floor(Date.now() / 1000);

  if (cache && cache.exp - now > 60) {
    console.log('Using cached token');
    return cache.token;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });

  try {
    const resp = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`SF token error: ${resp.status} ${errorText}`);
      throw new Error(`SF token error: ${resp.status} ${errorText}`);
    }

    const token = (await resp.json()) as SfClientCredentialsToken;
    const ttl = typeof token.expires_in === 'number' ? token.expires_in : 600;
    cache = { token, exp: now + Math.max(60, ttl - 30) };

    console.log('Token fetched successfully', token);

    return token;
  } catch (error: any) {
  console.error('Error fetching Salesforce token:', error);
  throw new Error('Error fetching Salesforce token: ' + (error?.message ?? String(error)));
}
}

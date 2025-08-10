// salesforce/sfFetch.ts
import { getClientCredentialsToken } from './auth';

type FetchInit = RequestInit & { headers?: Record<string, string> };

export async function sfFetch(path: string, init?: FetchInit) {
  // path should start with /services/data/...
  let { access_token, instance_url } = await getClientCredentialsToken();
  let res = await fetch(instance_url + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });

  // Retry once on session issues
  if (res.status === 401) {
    // Some orgs send 401; some send 200 with an error payload. 401 is easy:
    await getClientCredentialsToken({ forceRefresh: true });
    ({ access_token, instance_url } = await getClientCredentialsToken());
    res = await fetch(instance_url + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {})
      }
    });
  }

  return res;
}

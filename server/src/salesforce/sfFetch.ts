// salesforce/sfFetch.ts
import { getClientCredentialsToken } from './auth';

type FetchInit = RequestInit & { headers?: Record<string, string> };

export async function sfFetch(path: string, init?: FetchInit) {
  let { access_token, instance_url } = await getClientCredentialsToken();
  let res = await fetch(instance_url + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });

  if (res.status === 401) {
    // Force refresh and retry once
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


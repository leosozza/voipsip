import { getSetting, setSetting, logEvent } from './db';

/**
 * Bitrix24 REST client for a single portal, authenticated as the local user.
 *
 * Tokens arrive from the app iframe (BX24.getAuth) every time the user opens the
 * app inside Bitrix24. With the local app's client_id/secret we can also refresh
 * them on our own, so the connector keeps working while the iframe is closed.
 */

export const K = {
  domain: 'bitrix.domain',
  memberId: 'bitrix.member_id',
  clientId: 'bitrix.client_id',
  clientSecret: 'bitrix.client_secret',
  accessToken: 'bitrix.access_token',
  refreshToken: 'bitrix.refresh_token',
  expiresAt: 'bitrix.expires_at',
  userId: 'bitrix.user_id',
  userName: 'bitrix.user_name',
  isAdmin: 'bitrix.is_admin',
  lineNumber: 'bitrix.line_number',
} as const;

export class BitrixError extends Error {
  constructor(public code: string, description?: string) {
    super(description ? `${code}: ${description}` : code);
  }
}

export interface IframeAuth {
  access_token: string;
  refresh_token?: string;
  expires_in?: number | string;
  domain: string;
  member_id: string;
}

export function saveIframeAuth(auth: IframeAuth): void {
  const knownMember = getSetting(K.memberId);
  if (knownMember && knownMember !== auth.member_id) {
    // A different portal: never mix tokens or call history between tenants.
    throw new BitrixError('PORTAL_MISMATCH', `Este conector já está vinculado a outro portal (${getSetting(K.domain)}).`);
  }
  setSetting(K.domain, auth.domain);
  setSetting(K.memberId, auth.member_id);
  setSetting(K.accessToken, auth.access_token);
  if (auth.refresh_token) setSetting(K.refreshToken, auth.refresh_token);
  const ttl = Number(auth.expires_in) || 3600;
  setSetting(K.expiresAt, new Date(Date.now() + ttl * 1000).toISOString());
}

export function isConnected(): boolean {
  return !!(getSetting(K.domain) && getSetting(K.accessToken));
}

export function canRefresh(): boolean {
  return !!(getSetting(K.clientId) && getSetting(K.clientSecret) && getSetting(K.refreshToken));
}

let refreshing: Promise<void> | null = null;

async function refreshTokens(): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const clientId = getSetting(K.clientId);
    const clientSecret = getSetting(K.clientSecret);
    const refreshToken = getSetting(K.refreshToken);
    if (!clientId || !clientSecret || !refreshToken) {
      throw new BitrixError('NO_REFRESH', 'Token expirado. Abra o aplicativo no Bitrix24 ou informe client_id/client_secret.');
    }
    const url = new URL('https://oauth.bitrix.info/oauth/token/');
    url.search = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }).toString();
    const res = await fetch(url);
    const data = (await res.json()) as Record<string, any>;
    if (data.error) throw new BitrixError(String(data.error), data.error_description);
    setSetting(K.accessToken, data.access_token);
    setSetting(K.refreshToken, data.refresh_token);
    setSetting(K.expiresAt, new Date(Date.now() + (Number(data.expires_in) || 3600) * 1000).toISOString());
    logEvent('bitrix', 'token_refreshed');
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function validToken(): Promise<string> {
  const expiresAt = getSetting(K.expiresAt);
  const expiringSoon = !expiresAt || Date.parse(expiresAt) - Date.now() < 60_000;
  if (expiringSoon && canRefresh()) await refreshTokens();
  const token = getSetting(K.accessToken);
  if (!token) throw new BitrixError('NOT_CONNECTED', 'Conector ainda não vinculado ao Bitrix24.');
  return token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function call<T = any>(method: string, params: Record<string, unknown> = {}, attempt = 0): Promise<T> {
  const domain = getSetting(K.domain);
  if (!domain) throw new BitrixError('NOT_CONNECTED', 'Conector ainda não vinculado ao Bitrix24.');
  const auth = await validToken();

  const res = await fetch(`https://${domain}/rest/${method}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...params, auth }),
  });
  const data = (await res.json().catch(() => ({ error: 'BAD_RESPONSE', error_description: `HTTP ${res.status}` }))) as Record<string, any>;

  if (data.error) {
    const code = String(data.error);
    if (attempt === 0 && (code === 'expired_token' || code === 'invalid_token') && canRefresh()) {
      await refreshTokens();
      return call<T>(method, params, attempt + 1);
    }
    if (attempt < 2 && code === 'QUERY_LIMIT_EXCEEDED') {
      await sleep(1000 * (attempt + 1));
      return call<T>(method, params, attempt + 1);
    }
    throw new BitrixError(code, data.error_description);
  }
  return data.result as T;
}

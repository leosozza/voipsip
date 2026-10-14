import { randomBytes } from 'node:crypto';
import * as bitrix from './bitrix';
import { K } from './bitrix';
import { getSetting, logEvent, setSetting } from './db';
import { bindCallEvents } from './events';

/**
 * Connecting a portal: the user creates a "local application" in their Bitrix24
 * (handler path = http://localhost:<port>/bitrix/app), pastes client_id/secret here,
 * and we run the OAuth authorization-code flow. Bitrix24 redirects the browser back
 * to the handler path, which is served by this local server.
 */

const OAUTH_STATE = 'oauth.state';

export function normalizePortal(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  return url.host;
}

export function beginOAuth(portal: string, clientId: string, clientSecret: string): string {
  const domain = normalizePortal(portal);
  const known = getSetting(K.domain);
  if (known && known !== domain && getSetting(K.accessToken)) {
    throw new bitrix.BitrixError('PORTAL_MISMATCH', `Desconecte o portal ${known} antes de conectar outro.`);
  }
  setSetting(K.domain, domain);
  setSetting(K.clientId, clientId.trim());
  setSetting(K.clientSecret, clientSecret.trim());
  const state = randomBytes(16).toString('hex');
  setSetting(OAUTH_STATE, state);
  const url = new URL(`https://${domain}/oauth/authorize/`);
  url.search = new URLSearchParams({ client_id: clientId.trim(), state }).toString();
  return url.toString();
}

export async function completeOAuth(params: { code: string; state: string; domain?: string; member_id?: string }): Promise<void> {
  const expected = getSetting(OAUTH_STATE);
  if (!expected || params.state !== expected) throw new bitrix.BitrixError('BAD_STATE', 'Pedido de autorização inválido ou expirado. Tente conectar novamente.');
  setSetting(OAUTH_STATE, null);

  const url = new URL('https://oauth.bitrix.info/oauth/token/');
  url.search = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: getSetting(K.clientId) || '',
    client_secret: getSetting(K.clientSecret) || '',
    code: params.code,
  }).toString();
  const res = await fetch(url);
  const data = (await res.json()) as Record<string, any>;
  if (data.error) throw new bitrix.BitrixError(String(data.error), data.error_description);

  const domain = data.client_endpoint ? new URL(data.client_endpoint).host : params.domain || getSetting(K.domain)!;
  bitrix.saveIframeAuth({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    domain,
    member_id: data.member_id || params.member_id || '',
  });
  await afterConnect();
}

/** Tokens handed to us by the Bitrix24 iframe (BX24.getAuth or the handler POST). */
export async function acceptIframeAuth(auth: bitrix.IframeAuth): Promise<void> {
  if (!auth?.access_token || !auth.domain || !auth.member_id) throw new bitrix.BitrixError('BAD_AUTH', 'Dados de autorização incompletos.');
  // Verify the token against the claimed portal before trusting it.
  const res = await fetch(`https://${normalizePortal(auth.domain)}/rest/app.info.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth: auth.access_token }),
  });
  const info = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (info.error || !info.result) throw new bitrix.BitrixError('BAD_AUTH', 'Token do Bitrix24 inválido.');
  const firstTime = !getSetting(K.userId);
  bitrix.saveIframeAuth({ ...auth, domain: normalizePortal(auth.domain) });
  if (firstTime) await afterConnect();
  else await identifyUser();
}

/** Identify the local user and register the app's external line + call events. */
export async function afterConnect(): Promise<void> {
  await identifyUser();
  await ensureExternalLine().catch((err) => logEvent('bitrix', 'line_failed', { error: (err as Error).message }));
  await bindCallEvents();
}

/** The PC belongs to whoever authorized it: their Bitrix24 user receives this PC's calls. */
async function identifyUser(): Promise<void> {
  const me = await bitrix.call<{ ID: string; NAME?: string; LAST_NAME?: string }>('user.current');
  setSetting(K.userId, String(me.ID));
  setSetting(K.userName, [me.NAME, me.LAST_NAME].filter(Boolean).join(' ') || `Usuário ${me.ID}`);
  const isAdmin = await bitrix.call<boolean>('user.admin').catch(() => false);
  setSetting(K.isAdmin, isAdmin ? '1' : '0');
  logEvent('bitrix', 'connected', { domain: getSetting(K.domain), user: me.ID, isAdmin });
}

export async function ensureExternalLine(): Promise<void> {
  const number = getSetting(K.lineNumber) || 'MicroSIP';
  setSetting(K.lineNumber, number);
  const lines = await bitrix.call<Array<{ NUMBER: string }>>('telephony.externalLine.get');
  if (!lines?.some((l) => l.NUMBER === number)) {
    await bitrix.call('telephony.externalLine.add', { NUMBER: number, NAME: `VoipSip ${number}` });
  }
}

export function disconnect(): void {
  for (const key of [K.accessToken, K.refreshToken, K.expiresAt, K.userId, K.userName, K.isAdmin, K.memberId]) setSetting(key, null);
  logEvent('bitrix', 'disconnected');
}

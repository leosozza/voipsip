import fs from 'node:fs';
import path from 'node:path';
import { Hono, type Context } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { streamSSE } from 'hono/streaming';
import { timingSafeEqual } from 'node:crypto';
import { BASE_URL, PORT, STATIC_DIR, DATA_DIR } from './config';
import { db, getSetting, getSettings, newId, setSetting } from './db';
import * as bitrix from './bitrix';
import { K } from './bitrix';
import * as microsip from './microsip';
import * as calls from './calls';
import { DIAL } from './calls';
import * as setup from './setup';
import { bindCallEvents, pollerState } from './events';
import { bus } from './bus';

export const app = new Hono();

// ---------- security ----------

const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);
const BITRIX_FRAME_ANCESTORS = ['https://*.bitrix24.com', 'https://*.bitrix24.com.br', 'https://*.bitrix24.es', 'https://*.bitrix24.de', 'https://*.bitrix24.eu', 'https://*.bitrix24.ru', 'https://*.bitrix24.in', 'https://*.bitrix24.fr', 'https://*.bitrix24.it', 'https://*.bitrix24.pl', 'https://*.bitrix24.uk'];

app.use('*', async (c, next) => {
  // DNS-rebinding guard: only answer requests addressed to localhost.
  if (!ALLOWED_HOSTS.has(c.req.header('host') || '')) return c.text('Forbidden host', 403);

  // State-changing API calls need a custom header. Browsers cannot send it cross-origin
  // without a CORS preflight, which we never approve, so other sites cannot drive the API.
  if (c.req.path.startsWith('/api/') && c.req.method !== 'GET' && c.req.header('x-voipsip') !== '1') {
    return c.json({ error: 'Missing x-voipsip header' }, 403);
  }
  await next();

  // The UI may be embedded only by the linked Bitrix24 portal.
  const domain = getSetting(K.domain);
  const ancestors = domain ? [`https://${domain}`, ...BITRIX_FRAME_ANCESTORS] : ['https:'];
  c.header('Content-Security-Policy', `frame-ancestors 'self' ${ancestors.join(' ')}`);
});

const tokenMatches = (given: string | undefined) => {
  const expected = Buffer.from(microsip.hookToken());
  const actual = Buffer.from(given || '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const fail = (c: Context, err: unknown, status: 400 | 500 = 400) => {
  const message = err instanceof Error ? err.message : String(err);
  return c.json({ error: message, code: err instanceof bitrix.BitrixError ? err.code : undefined }, status);
};

// ---------- status ----------

app.get('/api/status', (c) => {
  const s = getSettings([K.domain, K.userId, K.userName, K.isAdmin, K.lineNumber, K.clientId, K.expiresAt]);
  return c.json({
    version: process.env.npm_package_version || '0.1.0',
    platform: process.platform,
    baseUrl: BASE_URL,
    handlerUrl: `${BASE_URL}/bitrix/app`,
    dataDir: DATA_DIR,
    bitrix: {
      connected: bitrix.isConnected(),
      canRefresh: bitrix.canRefresh(),
      domain: s[K.domain],
      userId: s[K.userId],
      userName: s[K.userName],
      isAdmin: s[K.isAdmin] === '1',
      lineNumber: s[K.lineNumber],
      hasClientId: !!s[K.clientId],
      tokenExpiresAt: s[K.expiresAt],
    },
    events: pollerState,
    dial: {
      mode: calls.dialMode(),
      stripDdi: getSetting(DIAL.stripDdi) !== '0',
      prefix: getSetting(DIAL.prefix) || '',
      crmCreate: getSetting(DIAL.crmCreate) !== '0',
    },
    microsip: {
      supported: microsip.isWindows,
      exe: microsip.findExe(),
      ini: microsip.iniStatus(),
      recordingsDir: microsip.recordingsDir(),
    },
  });
});

// ---------- Bitrix24 connection ----------

app.post('/api/bitrix/connect', async (c) => {
  try {
    const { portal, clientId, clientSecret } = await c.req.json();
    if (!portal || !clientId || !clientSecret) throw new Error('Informe o endereço do portal, client_id e client_secret.');
    return c.json({ authorizeUrl: setup.beginOAuth(portal, clientId, clientSecret) });
  } catch (err) {
    return fail(c, err);
  }
});

app.post('/api/bitrix/iframe-auth', async (c) => {
  try {
    await setup.acceptIframeAuth(await c.req.json());
    return c.json({ ok: true });
  } catch (err) {
    return fail(c, err);
  }
});

app.post('/api/bitrix/resync', async (c) => {
  try {
    await setup.ensureExternalLine();
    return c.json({ ok: true, events: await bindCallEvents() });
  } catch (err) {
    return fail(c, err);
  }
});

app.post('/api/bitrix/disconnect', (c) => {
  setup.disconnect();
  return c.json({ ok: true });
});

/**
 * Handler path of the Bitrix24 local app. Bitrix24 hits it in two ways:
 *  - GET ?code=...&state=... — redirect at the end of the OAuth flow;
 *  - POST with AUTH_ID/REFRESH_ID — when the app is opened inside a portal frame.
 */
app.on(['GET', 'POST'], '/bitrix/app', async (c) => {
  const q = c.req.query();
  if (q.code && q.state) {
    try {
      await setup.completeOAuth({ code: q.code, state: q.state, domain: q.domain, member_id: q.member_id });
      return c.redirect('/?connected=1');
    } catch (err) {
      return c.redirect(`/?connect_error=${encodeURIComponent((err as Error).message)}`);
    }
  }
  if (c.req.method === 'POST') {
    const body = await c.req.parseBody().catch(() => ({}) as Record<string, unknown>);
    if (typeof body.AUTH_ID === 'string' && (q.DOMAIN || body.DOMAIN) && body.member_id) {
      await setup
        .acceptIframeAuth({
          access_token: body.AUTH_ID,
          refresh_token: typeof body.REFRESH_ID === 'string' ? body.REFRESH_ID : undefined,
          expires_in: typeof body.AUTH_EXPIRES === 'string' ? body.AUTH_EXPIRES : undefined,
          domain: String(q.DOMAIN || body.DOMAIN),
          member_id: String(body.member_id),
        })
        .catch(() => {});
    }
  }
  return serveIndex(c);
});

// ---------- settings ----------

const EDITABLE_SETTINGS = new Set<string>([DIAL.mode, DIAL.stripDdi, DIAL.prefix, DIAL.crmCreate, microsip.MS.exe, microsip.MS.recordingsDir, K.lineNumber, 'events.enabled']);

app.put('/api/settings', async (c) => {
  const body = (await c.req.json()) as Record<string, string | null>;
  for (const [key, value] of Object.entries(body)) {
    if (!EDITABLE_SETTINGS.has(key)) return c.json({ error: `Configuração desconhecida: ${key}` }, 400);
    setSetting(key, value === '' ? null : value);
  }
  bus.emit({ type: 'status' });
  return c.json({ ok: true });
});

// ---------- MicroSIP ----------

app.post('/api/microsip/configure', (c) => {
  try {
    return c.json(microsip.configureIni());
  } catch (err) {
    return fail(c, err, 500);
  }
});

app.post('/api/microsip/test-dial', async (c) => {
  const { number } = await c.req.json();
  return c.json(microsip.dial(calls.dialString(String(number || ''))));
});

/** Called by the .vbs scripts that MicroSIP runs on each call event. */
app.get('/hook/microsip/:event', async (c) => {
  if (!tokenMatches(c.req.query('token'))) return c.text('forbidden', 403);
  const event = c.req.param('event') as microsip.HookEvent;
  if (!Object.values(microsip.HOOK_EVENTS).includes(event)) return c.text('unknown event', 404);
  try {
    await calls.handleMicroSipHook(event, c.req.query('number') || '');
  } catch (err) {
    return c.text((err as Error).message, 500);
  }
  return c.text('ok');
});

// ---------- calls ----------

app.get('/api/calls', (c) => {
  const limit = Math.min(Number(c.req.query('limit')) || 100, 1000);
  return c.json(db.prepare('SELECT * FROM call_logs ORDER BY call_started_at DESC LIMIT ?').all(limit));
});

app.get('/api/calls/stats', (c) => {
  const days = Math.min(Number(c.req.query('days')) || 7, 90);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(direction = 'inbound') AS inbound,
              SUM(direction = 'outbound') AS outbound,
              SUM(status = 'completed') AS answered,
              SUM(status = 'missed') AS missed,
              COALESCE(SUM(duration_seconds), 0) AS duration
       FROM call_logs WHERE call_started_at >= ?`,
    )
    .get(since);
  const perDay = db
    .prepare(
      `SELECT substr(call_started_at, 1, 10) AS day,
              SUM(direction = 'inbound') AS inbound,
              SUM(direction = 'outbound') AS outbound
       FROM call_logs WHERE call_started_at >= ? GROUP BY day ORDER BY day`,
    )
    .all(since);
  return c.json({ totals, perDay });
});

/** Built-in WebRTC softphone reports its call lifecycle here. */
app.post('/api/calls/softphone', async (c) => {
  try {
    const { number, direction } = await c.req.json();
    return c.json(await calls.softphoneCallStarted(String(number), direction === 'inbound' ? 'inbound' : 'outbound', 'webrtc'));
  } catch (err) {
    return fail(c, err);
  }
});

app.post('/api/calls/:id/answered', (c) => {
  const row = calls.getCall(c.req.param('id'));
  if (!row) return c.json({ error: 'Chamada não encontrada' }, 404);
  calls.callAnswered(row);
  return c.json({ ok: true });
});

app.post('/api/calls/:id/ended', async (c) => {
  const row = calls.getCall(c.req.param('id'));
  if (!row) return c.json({ error: 'Chamada não encontrada' }, 404);
  await calls.callEnded(row);
  return c.json(calls.getCall(row.id));
});

app.post('/api/calls/:id/recording', async (c) => {
  const row = calls.getCall(c.req.param('id'));
  if (!row) return c.json({ error: 'Chamada não encontrada' }, 404);
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File) || !/\.(mp3|wav)$/i.test(file.name)) return c.json({ error: 'Envie um arquivo .mp3 ou .wav' }, 400);
  const dir = path.join(DATA_DIR, 'recordings');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${row.id}${path.extname(file.name).toLowerCase()}`);
  fs.writeFileSync(dest, Buffer.from(await file.arrayBuffer()));
  await calls.attachRecordingFile(row.id, dest);
  return c.json(calls.getCall(row.id));
});

// ---------- SIP accounts (WebRTC softphone) ----------

const SIP_FIELDS = ['display_name', 'sip_server', 'sip_domain', 'ws_port', 'ws_path', 'sip_username', 'sip_password', 'is_default'] as const;

app.get('/api/sip-accounts', (c) => c.json(db.prepare('SELECT * FROM sip_accounts ORDER BY created_at').all()));

app.post('/api/sip-accounts', async (c) => {
  const body = await c.req.json();
  const id = newId();
  if (body.is_default) db.exec('UPDATE sip_accounts SET is_default = 0');
  db.prepare(
    `INSERT INTO sip_accounts (id, ${SIP_FIELDS.join(', ')}) VALUES (?, ${SIP_FIELDS.map(() => '?').join(', ')})`,
  ).run(id, ...SIP_FIELDS.map((f) => (f === 'is_default' ? (body[f] ? 1 : 0) : body[f] ?? null)));
  return c.json(db.prepare('SELECT * FROM sip_accounts WHERE id = ?').get(id));
});

app.put('/api/sip-accounts/:id', async (c) => {
  const body = await c.req.json();
  const fields = SIP_FIELDS.filter((f) => f in body);
  if (body.is_default) db.exec('UPDATE sip_accounts SET is_default = 0');
  if (fields.length) {
    db.prepare(`UPDATE sip_accounts SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`).run(
      ...fields.map((f) => (f === 'is_default' ? (body[f] ? 1 : 0) : body[f] ?? null)),
      c.req.param('id'),
    );
  }
  return c.json(db.prepare('SELECT * FROM sip_accounts WHERE id = ?').get(c.req.param('id')));
});

app.delete('/api/sip-accounts/:id', (c) => {
  db.prepare('DELETE FROM sip_accounts WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

// ---------- diagnostics ----------

app.get('/api/event-log', (c) => c.json(db.prepare('SELECT * FROM event_log ORDER BY id DESC LIMIT 200').all()));

app.get('/api/stream', (c) =>
  streamSSE(c, async (stream) => {
    const unsubscribe = bus.subscribe((event) => void stream.writeSSE({ data: JSON.stringify(event) }));
    stream.onAbort(unsubscribe);
    while (!stream.aborted) {
      await stream.writeSSE({ event: 'ping', data: '' });
      await stream.sleep(25_000);
    }
  }),
);

// ---------- UI ----------

function serveIndex(c: Context) {
  const index = path.join(STATIC_DIR, 'index.html');
  if (!fs.existsSync(index)) return c.text(`UI não encontrada em ${STATIC_DIR}. Rode "npm run build".`, 500);
  return c.html(fs.readFileSync(index, 'utf8'));
}

app.use('/*', serveStatic({ root: path.relative(process.cwd(), STATIC_DIR) || '.' }));
app.get('*', (c) => (c.req.path.startsWith('/api/') ? c.json({ error: 'Not found' }, 404) : serveIndex(c)));

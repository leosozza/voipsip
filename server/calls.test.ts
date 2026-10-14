// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.VOIPSIP_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'voipsip-test-'));

type Calls = Array<{ method: string; body: Record<string, any> }>;

/** Fake Bitrix24 REST: records every call and answers from a per-method table. */
function mockBitrix(responses: Record<string, (body: Record<string, any>) => unknown>) {
  const calls: Calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const method = String(url).match(/\/rest\/(.+)\.json$/)?.[1] ?? String(url);
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ method, body });
      const handler = responses[method];
      const result = handler ? handler(body) : {};
      return new Response(JSON.stringify({ result }), { headers: { 'Content-Type': 'application/json' } });
    }),
  );
  return calls;
}

let db: typeof import('./db');
let calls: typeof import('./calls');
let events: typeof import('./events');

beforeAll(async () => {
  db = await import('./db');
  calls = await import('./calls');
  events = await import('./events');
});

beforeEach(() => {
  db.db.exec('DELETE FROM call_logs; DELETE FROM settings;');
  db.setSetting('bitrix.domain', 'acme.bitrix24.com.br');
  db.setSetting('bitrix.access_token', 'token');
  db.setSetting('bitrix.expires_at', new Date(Date.now() + 3_600_000).toISOString());
  db.setSetting('bitrix.user_id', '7');
  db.setSetting('bitrix.line_number', 'MicroSIP');
  db.setSetting('dial.mode', 'webrtc');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('inbound call via MicroSIP hooks', () => {
  it('registers, answers and finishes the call in Bitrix24', async () => {
    const bitrix = mockBitrix({ 'telephony.externalCall.register': () => ({ CALL_ID: 'externalCall.1' }) });

    await calls.handleMicroSipHook('incoming', '+55 (11) 99999-0000');
    await calls.handleMicroSipHook('incoming', '5511999990000'); // duplicate hook for the same ring
    const register = bitrix.filter((c) => c.method === 'telephony.externalCall.register');
    expect(register).toHaveLength(1);
    expect(register[0].body).toMatchObject({ USER_ID: 7, TYPE: 2, SHOW: 1, LINE_NUMBER: 'MicroSIP', PHONE_NUMBER: '5511999990000' });

    await calls.handleMicroSipHook('answer', '11999990000'); // MicroSIP may report it without DDI
    await calls.handleMicroSipHook('end', '11999990000');

    const finish = bitrix.find((c) => c.method === 'telephony.externalCall.finish');
    expect(finish?.body).toMatchObject({ CALL_ID: 'externalCall.1', USER_ID: 7, STATUS_CODE: '200' });
    const [row] = db.db.prepare('SELECT * FROM call_logs').all() as any[];
    expect(row).toMatchObject({ direction: 'inbound', status: 'completed', bitrix_call_id: 'externalCall.1' });
  });

  it('reports an unanswered call as missed', async () => {
    const bitrix = mockBitrix({ 'telephony.externalCall.register': () => ({ CALL_ID: 'externalCall.2' }) });
    await calls.handleMicroSipHook('incoming', '5511988887777');
    await calls.handleMicroSipHook('end', '5511988887777');
    expect(bitrix.find((c) => c.method === 'telephony.externalCall.finish')?.body).toMatchObject({ STATUS_CODE: '304', DURATION: 0 });
    expect((db.db.prepare('SELECT status FROM call_logs').get() as any).status).toBe('missed');
  });
});

describe('click-to-call from Bitrix24 (offline events)', () => {
  const event = (id: string, userId: string, ageMs = 0) => ({
    ID: id,
    MESSAGE_ID: id,
    TIMESTAMP_X: new Date(Date.now() - ageMs).toISOString(),
    EVENT_NAME: 'ONEXTERNALCALLSTART',
    EVENT_DATA: { PHONE_NUMBER: '5515996045202', USER_ID: userId, CALL_ID: `externalCall.${id}`, CRM_ENTITY_TYPE: 'CONTACT', CRM_ENTITY_ID: '42' },
  });

  it('takes only this PC user events, reuses the Bitrix CALL_ID and strips DDI 55', async () => {
    const queue = [event('1', '7'), event('2', '99')];
    const bitrix = mockBitrix({
      'event.offline.list': () => queue,
      'event.offline.get': (body) => ({ events: queue.filter((e) => e.ID === body.filter['=ID']) }),
    });
    const { bus } = await import('./bus');
    const dials: any[] = [];
    const off = bus.subscribe((e) => e.type === 'dial' && dials.push(e));

    events.startPoller();
    await vi.waitFor(() => expect(dials).toHaveLength(1));
    events.stopPoller();
    off();

    expect(dials[0]).toMatchObject({ number: '15996045202', mode: 'webrtc' });
    const taken = bitrix.filter((c) => c.method === 'event.offline.get').map((c) => c.body.filter['=ID']);
    expect(taken).toEqual(['1']); // the other user's event stays in the queue for their PC
    expect(bitrix.some((c) => c.method === 'telephony.externalCall.register')).toBe(false);
    const row = db.db.prepare('SELECT * FROM call_logs').get() as any;
    expect(row).toMatchObject({ direction: 'outbound', bitrix_call_id: 'externalCall.1', crm_entity_id: '42', phone_number: '5515996045202' });
  });

  it('drops stale events of other users so the queue does not grow', async () => {
    const queue = [event('3', '99', 10 * 60_000)];
    const bitrix = mockBitrix({
      'event.offline.list': () => queue,
      'event.offline.get': () => ({ events: queue }),
    });
    events.startPoller();
    await vi.waitFor(() => expect(bitrix.some((c) => c.method === 'event.offline.get')).toBe(true));
    events.stopPoller();
    expect(db.db.prepare('SELECT COUNT(*) AS n FROM call_logs').get()).toMatchObject({ n: 0 });
  });
});

describe('dial string', () => {
  it('applies prefix and keeps DDI when configured', () => {
    db.setSetting('dial.prefix', '0');
    expect(calls.dialString('+55 15 99604-5202')).toBe('015996045202');
    db.setSetting('dial.strip_ddi', '0');
    expect(calls.dialString('+55 15 99604-5202')).toBe('05515996045202');
  });
});

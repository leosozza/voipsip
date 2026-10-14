import fs from 'node:fs';
import path from 'node:path';
import { db, getSetting, logEvent, newId, now } from './db';
import * as bitrix from './bitrix';
import { K } from './bitrix';
import * as microsip from './microsip';
import { bus } from './bus';
import { digits, sameNumber, stripBrazilDDI } from './phone';

export const DIAL = {
  mode: 'dial.mode', // 'microsip' | 'webrtc'
  stripDdi: 'dial.strip_ddi', // '1' | '0'
  prefix: 'dial.prefix', // e.g. '0' to seize an outside line
  crmCreate: 'crm.create', // '1' | '0' — create a lead for unknown inbound numbers
} as const;

export type DialMode = 'microsip' | 'webrtc';
export type Direction = 'inbound' | 'outbound';

export interface CallRow {
  id: string;
  direction: Direction;
  phone_number: string;
  status: 'dialing' | 'ringing' | 'answered' | 'completed' | 'missed' | 'failed';
  source: string;
  bitrix_call_id: string | null;
  bitrix_user_id: string | null;
  crm_entity_type: string | null;
  crm_entity_id: string | null;
  duration_seconds: number;
  recording_file: string | null;
  recording_status: string | null;
  error: string | null;
  call_started_at: string;
  call_answered_at: string | null;
  call_ended_at: string | null;
}

export function dialMode(): DialMode {
  return (getSetting(DIAL.mode) as DialMode) || (microsip.isWindows ? 'microsip' : 'webrtc');
}

/** Number as the PBX expects it. The original stays in the call log and in Bitrix24. */
export function dialString(phone: string): string {
  const n = getSetting(DIAL.stripDdi) === '0' ? digits(phone) : stripBrazilDDI(phone);
  return (getSetting(DIAL.prefix) || '') + n;
}

export function getCall(id: string): CallRow | undefined {
  return db.prepare('SELECT * FROM call_logs WHERE id = ?').get(id) as CallRow | undefined;
}

function updateCall(id: string, fields: Partial<CallRow>): void {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  db.prepare(`UPDATE call_logs SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(
    ...keys.map((k) => (fields as Record<string, any>)[k] ?? null),
    id,
  );
  bus.emit({ type: 'call_updated', callId: id });
}

function insertCall(row: Omit<CallRow, 'id' | 'duration_seconds' | 'recording_file' | 'recording_status' | 'error' | 'call_answered_at' | 'call_ended_at'>): CallRow {
  const id = newId();
  db.prepare(
    `INSERT INTO call_logs (id, direction, phone_number, status, source, bitrix_call_id, bitrix_user_id, crm_entity_type, crm_entity_id, call_started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, row.direction, row.phone_number, row.status, row.source, row.bitrix_call_id, row.bitrix_user_id, row.crm_entity_type, row.crm_entity_id, row.call_started_at);
  bus.emit({ type: 'call_updated', callId: id });
  return getCall(id)!;
}

/** Most recent unfinished call for a number (MicroSIP hooks only tell us the number). */
function findActiveCall(number: string, maxAgeMs: number, direction?: Direction): CallRow | undefined {
  const since = new Date(Date.now() - maxAgeMs).toISOString();
  const rows = db
    .prepare(
      `SELECT * FROM call_logs WHERE call_ended_at IS NULL AND call_started_at >= ? ${direction ? 'AND direction = ?' : ''}
       ORDER BY call_started_at DESC LIMIT 20`,
    )
    .all(...(direction ? [since, direction] : [since])) as unknown as CallRow[];
  return rows.find((r) => sameNumber(r.phone_number, number));
}

const localUserId = () => getSetting(K.userId);

async function registerInBitrix(number: string, direction: Direction, show: boolean): Promise<string | null> {
  const params: Record<string, unknown> = {
    USER_ID: Number(localUserId()) || 1,
    PHONE_NUMBER: number,
    TYPE: direction === 'outbound' ? 1 : 2,
    CALL_START_DATE: now(),
    CRM_CREATE: getSetting(DIAL.crmCreate) === '0' ? 0 : 1,
    SHOW: show ? 1 : 0,
  };
  const line = getSetting(K.lineNumber);
  if (line) params.LINE_NUMBER = line;
  const result = await bitrix.call<{ CALL_ID: string }>('telephony.externalCall.register', params);
  return result?.CALL_ID ?? null;
}

// ---------- outbound from Bitrix24 (click-to-call) ----------

export interface ExternalCallStart {
  PHONE_NUMBER: string;
  USER_ID: string;
  CALL_ID: string;
  CRM_ENTITY_TYPE?: string;
  CRM_ENTITY_ID?: string;
}

/** Returns false when the event belongs to another user's PC. */
export function isForThisPc(data: { USER_ID?: string | number }): boolean {
  const mine = localUserId();
  return !mine || String(data.USER_ID) === mine;
}

export function startOutboundFromBitrix(data: ExternalCallStart): CallRow {
  // Bitrix24 already registered this call (CALL_ID) — registering again would duplicate it.
  const mode = dialMode();
  const row = insertCall({
    direction: 'outbound',
    phone_number: data.PHONE_NUMBER,
    status: 'dialing',
    source: mode,
    bitrix_call_id: data.CALL_ID,
    bitrix_user_id: String(data.USER_ID),
    crm_entity_type: data.CRM_ENTITY_TYPE || null,
    crm_entity_id: data.CRM_ENTITY_ID || null,
    call_started_at: now(),
  });

  const number = dialString(data.PHONE_NUMBER);
  if (mode === 'microsip') {
    const result = microsip.dial(number);
    if (!result.ok) {
      updateCall(row.id, { status: 'failed', error: result.error ?? null });
      void finishInBitrix(getCall(row.id)!, 'OTHER');
      return getCall(row.id)!;
    }
  }
  bus.emit({ type: 'dial', callId: row.id, number, mode });
  return row;
}

// ---------- calls seen by the softphone ----------

/** Inbound ring, or an outbound call typed directly in the softphone. */
export async function softphoneCallStarted(number: string, direction: Direction, source: string): Promise<CallRow> {
  if (direction === 'outbound') {
    // Dialed by us a moment ago from a Bitrix24 click? Then it is already tracked.
    const existing = findActiveCall(number, 2 * 60_000, 'outbound');
    if (existing) return existing;
  } else {
    // MicroSIP can fire both "incoming" and "ring" style hooks for the same call.
    const existing = findActiveCall(number, 60_000, 'inbound');
    if (existing) return existing;
  }

  const row = insertCall({
    direction,
    phone_number: number,
    status: direction === 'inbound' ? 'ringing' : 'dialing',
    source,
    bitrix_call_id: null,
    bitrix_user_id: localUserId(),
    crm_entity_type: null,
    crm_entity_id: null,
    call_started_at: now(),
  });

  try {
    const bitrixCallId = await registerInBitrix(number, direction, direction === 'inbound');
    updateCall(row.id, { bitrix_call_id: bitrixCallId });
  } catch (err) {
    updateCall(row.id, { error: (err as Error).message });
    logEvent('bitrix', 'register_failed', { number, error: (err as Error).message });
  }
  return getCall(row.id)!;
}

export function callAnswered(row: CallRow): void {
  if (row.call_answered_at || row.call_ended_at) return;
  updateCall(row.id, { status: 'answered', call_answered_at: now() });
}

export async function callEnded(row: CallRow): Promise<void> {
  if (row.call_ended_at) return;
  const fresh = getCall(row.id)!;
  const answered = !!fresh.call_answered_at;
  const duration = answered ? Math.max(0, Math.round((Date.now() - Date.parse(fresh.call_answered_at!)) / 1000)) : 0;
  updateCall(row.id, {
    status: fresh.status === 'failed' ? 'failed' : answered ? 'completed' : 'missed',
    duration_seconds: duration,
    call_ended_at: now(),
  });

  const ended = getCall(row.id)!;
  const finished = await finishInBitrix(ended, answered ? '200' : '304');
  if (finished && answered && ended.source === 'microsip') {
    // MicroSIP finishes writing the file a moment after hangup.
    setTimeout(() => void attachMicroSipRecording(ended.id), 4_000);
  }
}

async function finishInBitrix(row: CallRow, statusCode: string): Promise<boolean> {
  if (!row.bitrix_call_id) return false;
  try {
    await bitrix.call('telephony.externalCall.finish', {
      CALL_ID: row.bitrix_call_id,
      USER_ID: Number(row.bitrix_user_id || localUserId()) || 1,
      DURATION: row.duration_seconds,
      STATUS_CODE: statusCode,
    });
    return true;
  } catch (err) {
    updateCall(row.id, { error: (err as Error).message });
    logEvent('bitrix', 'finish_failed', { callId: row.id, error: (err as Error).message });
    return false;
  }
}

// ---------- recordings ----------

const MAX_RECORDING_BYTES = 40 * 1024 * 1024;

export async function attachRecordingFile(callId: string, file: string): Promise<void> {
  const row = getCall(callId);
  if (!row?.bitrix_call_id) return;
  try {
    const size = fs.statSync(file).size;
    if (size > MAX_RECORDING_BYTES) throw new Error(`Gravação muito grande (${Math.round(size / 1e6)} MB)`);
    await bitrix.call('telephony.externalCall.attachRecord', {
      CALL_ID: row.bitrix_call_id,
      FILENAME: path.basename(file),
      FILE_CONTENT: fs.readFileSync(file).toString('base64'),
    });
    updateCall(callId, { recording_file: file, recording_status: 'attached' });
  } catch (err) {
    updateCall(callId, { recording_file: file, recording_status: 'failed', error: (err as Error).message });
  }
}

async function attachMicroSipRecording(callId: string): Promise<void> {
  const row = getCall(callId);
  if (!row) return;
  const file = microsip.findRecording(row.phone_number, new Date(row.call_started_at));
  if (!file) {
    updateCall(callId, { recording_status: 'not_found' });
    return;
  }
  await attachRecordingFile(callId, file);
}

// ---------- MicroSIP hook entry point ----------

export async function handleMicroSipHook(event: microsip.HookEvent, rawNumber: string): Promise<void> {
  const number = digits(rawNumber) || rawNumber;
  logEvent('microsip', event, { number });
  if (!number) return;

  switch (event) {
    case 'incoming':
      await softphoneCallStarted(number, 'inbound', 'microsip');
      break;
    case 'outgoing':
      await softphoneCallStarted(number, 'outbound', 'microsip');
      break;
    case 'answer':
    case 'start': {
      const row = findActiveCall(number, 2 * 60 * 60_000);
      if (row) callAnswered(row);
      break;
    }
    case 'end': {
      const row = findActiveCall(number, 2 * 60 * 60_000);
      if (row) await callEnded(row);
      break;
    }
  }
}

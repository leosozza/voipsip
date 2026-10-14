import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { DB_PATH } from './config';

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS sip_accounts (
    id           TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    sip_server   TEXT NOT NULL,
    sip_domain   TEXT,
    ws_port      INTEGER NOT NULL DEFAULT 8089,
    ws_path      TEXT NOT NULL DEFAULT '/ws',
    sip_username TEXT NOT NULL,
    sip_password TEXT NOT NULL,
    is_default   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS call_logs (
    id               TEXT PRIMARY KEY,
    direction        TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    phone_number     TEXT NOT NULL,
    status           TEXT NOT NULL CHECK (status IN ('dialing', 'ringing', 'answered', 'completed', 'missed', 'failed')),
    source           TEXT NOT NULL DEFAULT 'microsip',
    bitrix_call_id   TEXT,
    bitrix_user_id   TEXT,
    crm_entity_type  TEXT,
    crm_entity_id    TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    recording_file   TEXT,
    recording_status TEXT,
    error            TEXT,
    call_started_at  TEXT NOT NULL,
    call_answered_at TEXT,
    call_ended_at    TEXT
  );
  CREATE INDEX IF NOT EXISTS call_logs_started_idx ON call_logs (call_started_at DESC);

  CREATE TABLE IF NOT EXISTS event_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    source     TEXT NOT NULL,
    name       TEXT NOT NULL,
    payload    TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

export const now = () => new Date().toISOString();
export const newId = () => randomUUID();

// ---------- settings ----------

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string | null } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string | null): void {
  if (value === null) {
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  } else {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
  }
}

export function getSettings(keys: readonly string[]): Record<string, string | null> {
  return Object.fromEntries(keys.map((k) => [k, getSetting(k)]));
}

// ---------- event log (debug trail, kept small) ----------

export function logEvent(source: string, name: string, payload?: unknown): void {
  db.prepare('INSERT INTO event_log (source, name, payload) VALUES (?, ?, ?)').run(
    source,
    name,
    payload === undefined ? null : JSON.stringify(payload),
  );
  db.prepare('DELETE FROM event_log WHERE id <= (SELECT MAX(id) - 500 FROM event_log)').run();
}

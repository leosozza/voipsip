import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { HOOKS_DIR, PORT } from './config';
import { getSetting, setSetting } from './db';
import { digits } from './phone';

/**
 * MicroSIP integration (Windows only):
 *  - outbound: `microsip.exe <number>` dials immediately;
 *  - call events: MicroSIP runs a command per event (cmdIncomingCall, cmdCallEnd...)
 *    with the caller number as argument. We point those at tiny .vbs scripts that
 *    call our local HTTP hook without flashing a console window;
 *  - recordings: read straight from MicroSIP's recording folder and uploaded to Bitrix24.
 */

export const MS = {
  exe: 'microsip.exe_path',
  recordingsDir: 'microsip.recordings_dir',
  hookToken: 'hook.token',
} as const;

/** MicroSIP ini key -> our hook event name. */
export const HOOK_EVENTS = {
  cmdIncomingCall: 'incoming',
  cmdOutgoingCall: 'outgoing',
  cmdCallAnswer: 'answer',
  cmdCallStart: 'start',
  cmdCallEnd: 'end',
} as const;

export type HookEvent = (typeof HOOK_EVENTS)[keyof typeof HOOK_EVENTS];

export const isWindows = process.platform === 'win32';

export function hookToken(): string {
  let token = getSetting(MS.hookToken);
  if (!token) {
    token = randomBytes(16).toString('hex');
    setSetting(MS.hookToken, token);
  }
  return token;
}

function candidateExePaths(): string[] {
  const env = process.env;
  return [
    env['ProgramFiles(x86)'] && path.join(env['ProgramFiles(x86)'], 'MicroSIP', 'microsip.exe'),
    env.ProgramFiles && path.join(env.ProgramFiles, 'MicroSIP', 'microsip.exe'),
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'MicroSIP', 'microsip.exe'),
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs', 'MicroSIP', 'microsip.exe'),
  ].filter((p): p is string => !!p);
}

export function findExe(): string | null {
  const configured = getSetting(MS.exe);
  if (configured && fs.existsSync(configured)) return configured;
  if (!isWindows) return null;
  return candidateExePaths().find((p) => fs.existsSync(p)) ?? null;
}

/** Installer builds keep the ini in %APPDATA%; portable builds keep it next to the exe. */
export function findIni(): string | null {
  const exe = findExe();
  const candidates = [
    exe && path.join(path.dirname(exe), 'microsip.ini'),
    process.env.APPDATA && path.join(process.env.APPDATA, 'MicroSIP', 'microsip.ini'),
  ].filter((p): p is string => !!p);
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

export function dial(number: string): { ok: boolean; error?: string } {
  const exe = findExe();
  if (!exe) return { ok: false, error: 'MicroSIP não encontrado. Informe o caminho do microsip.exe nas configurações.' };
  const child = spawn(exe, [number], { detached: true, stdio: 'ignore', windowsHide: false });
  child.on('error', () => {});
  child.unref();
  return { ok: true };
}

// ---------- ini handling ----------

function readIni(file: string): { lines: string[]; utf16: boolean } {
  // MicroSIP writes UTF-16 LE with BOM on some versions, ANSI/UTF-8 on others.
  // Windows' profile API only understands UTF-16 with BOM for non-ASCII paths, so keep the encoding.
  const buf = fs.readFileSync(file);
  const utf16 = buf[0] === 0xff && buf[1] === 0xfe;
  const text = utf16 ? buf.toString('utf16le').slice(1) : buf.toString('utf8');
  return { lines: text.split(/\r?\n/), utf16 };
}

function readSettingsSection(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  let inSettings = false;
  for (const line of readIni(file).lines) {
    const section = line.match(/^\s*\[(.+)\]\s*$/);
    if (section) {
      inSettings = section[1].toLowerCase() === 'settings';
      continue;
    }
    const kv = line.match(/^([^=;]+)=(.*)$/);
    if (inSettings && kv) out[kv[1].trim()] = kv[2].trim();
  }
  return out;
}

function hookScript(event: HookEvent, token: string): string {
  const url = `http://127.0.0.1:${PORT}/hook/microsip/${event}?token=${token}&number=`;
  return [
    "' Gerado pelo VoipSip Connector. Avisa o conector sobre eventos do MicroSIP.",
    'Dim n: n = ""',
    'If WScript.Arguments.Count > 0 Then n = WScript.Arguments(0)',
    'On Error Resume Next',
    'Set h = CreateObject("MSXML2.ServerXMLHTTP.6.0")',
    'h.setTimeouts 2000, 2000, 5000, 5000',
    `h.open "GET", "${url}" & Escape(n), False`,
    'h.send',
    '',
  ].join('\r\n');
}

export function hookScriptPath(event: HookEvent): string {
  return path.join(HOOKS_DIR, `${event}.vbs`);
}

export function writeHookScripts(): void {
  fs.mkdirSync(HOOKS_DIR, { recursive: true });
  const token = hookToken();
  for (const event of Object.values(HOOK_EVENTS)) {
    fs.writeFileSync(hookScriptPath(event), hookScript(event, token));
  }
}

/**
 * Point MicroSIP's event commands at our hook scripts and enable auto recording.
 * MicroSIP rewrites its ini on exit, so it must be closed while we patch it.
 */
export function configureIni(): { ok: boolean; file?: string; error?: string } {
  const file = findIni();
  if (!file) return { ok: false, error: 'microsip.ini não encontrado. Abra e feche o MicroSIP uma vez e tente novamente.' };
  writeHookScripts();

  const desired: Record<string, string> = Object.fromEntries(
    Object.entries(HOOK_EVENTS).map(([key, event]) => [key, hookScriptPath(event)]),
  );
  desired.autoRecording = '1';

  const { lines, utf16 } = readIni(file);
  const out: string[] = [];
  let inSettings = false;
  let sawSettings = false;
  const pending = new Set(Object.keys(desired));

  const flushPending = () => {
    for (const key of pending) out.push(`${key}=${desired[key]}`);
    pending.clear();
  };

  for (const line of lines) {
    const section = line.match(/^\s*\[(.+)\]\s*$/);
    if (section) {
      if (inSettings) flushPending();
      inSettings = section[1].toLowerCase() === 'settings';
      sawSettings ||= inSettings;
      out.push(line);
      continue;
    }
    const kv = line.match(/^([^=;]+)=/);
    if (inSettings && kv && kv[1].trim() in desired) {
      const key = kv[1].trim();
      out.push(`${key}=${desired[key]}`);
      pending.delete(key);
      continue;
    }
    out.push(line);
  }
  if (inSettings) flushPending();
  if (!sawSettings) {
    out.push('[Settings]');
    flushPending();
  }

  fs.copyFileSync(file, `${file}.bak`);
  const text = out.join('\r\n');
  fs.writeFileSync(file, utf16 ? Buffer.from('\ufeff' + text, 'utf16le') : Buffer.from(text, 'utf8'));
  return { ok: true, file };
}

export function iniStatus() {
  const file = findIni();
  if (!file) return { file: null, hooksConfigured: false, recordingPath: null as string | null };
  const settings = readSettingsSection(file);
  const hooksConfigured = Object.entries(HOOK_EVENTS).every(
    ([key, event]) => settings[key]?.toLowerCase() === hookScriptPath(event).toLowerCase(),
  );
  return { file, hooksConfigured, recordingPath: settings.recordingPath || null };
}

// ---------- recordings ----------

export function recordingsDir(): string | null {
  const configured = getSetting(MS.recordingsDir);
  if (configured) return configured;
  const fromIni = iniStatus().recordingPath;
  if (fromIni) return fromIni;
  const home = process.env.USERPROFILE || process.env.HOME;
  return home ? path.join(home, 'Documents', 'MicroSIP') : null;
}

/** Newest .mp3/.wav written since the call started, preferring files named after the number. */
export function findRecording(number: string, startedAt: Date): string | null {
  const dir = recordingsDir();
  if (!dir || !fs.existsSync(dir)) return null;
  const tail = digits(number).slice(-8);
  const since = startedAt.getTime() - 5_000;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(mp3|wav)$/i.test(f))
    .map((f) => {
      const full = path.join(dir, f);
      return { full, name: f, mtime: fs.statSync(full).mtimeMs };
    })
    .filter((f) => f.mtime >= since)
    .sort((a, b) => b.mtime - a.mtime);
  const byNumber = tail ? files.find((f) => digits(f.name).includes(tail)) : undefined;
  return (byNumber ?? files[0])?.full ?? null;
}

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export const HOST = '127.0.0.1';
export const PORT = Number(process.env.VOIPSIP_PORT || 5180);

/** Public base URL as seen by the browser (Bitrix24 iframe + MicroSIP hooks). */
export const BASE_URL = `http://localhost:${PORT}`;

function defaultDataDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'VoipSip');
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'VoipSip');
    default:
      return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'voipsip');
  }
}

export const DATA_DIR = process.env.VOIPSIP_DATA_DIR || defaultDataDir();
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = path.join(DATA_DIR, 'voipsip.db');
export const HOOKS_DIR = path.join(DATA_DIR, 'hooks');

/** Built React UI. Overridable so Electron can point at its packaged resources. */
export const STATIC_DIR = process.env.VOIPSIP_STATIC_DIR || path.resolve(process.cwd(), 'dist');

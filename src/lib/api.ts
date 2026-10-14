/**
 * Client for the local connector server (server/app.ts).
 * The UI is always served from the same origin as the API.
 */

export type DialMode = 'microsip' | 'webrtc';
export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'dialing' | 'ringing' | 'answered' | 'completed' | 'missed' | 'failed';

export interface Status {
  version: string;
  platform: string;
  baseUrl: string;
  handlerUrl: string;
  dataDir: string;
  bitrix: {
    connected: boolean;
    canRefresh: boolean;
    domain: string | null;
    userId: string | null;
    userName: string | null;
    isAdmin: boolean;
    lineNumber: string | null;
    hasClientId: boolean;
    tokenExpiresAt: string | null;
  };
  events: { running: boolean; enabled: boolean; lastPollAt: string | null; lastError: string | null; lastEventAt: string | null };
  dial: { mode: DialMode; stripDdi: boolean; prefix: string; crmCreate: boolean };
  microsip: {
    supported: boolean;
    /** Detected or configured microsip.exe that exists on disk. */
    exe: string | null;
    /** Raw values saved in settings (may point to a missing file). */
    exePathSetting: string | null;
    recordingsDirSetting: string | null;
    ini: { file: string | null; hooksConfigured: boolean; recordingPath: string | null };
    recordingsDir: string | null;
  };
}

export interface CallLog {
  id: string;
  direction: CallDirection;
  phone_number: string;
  status: CallStatus;
  source: string;
  bitrix_call_id: string | null;
  bitrix_user_id: string | null;
  crm_entity_type: string | null;
  crm_entity_id: string | null;
  duration_seconds: number;
  recording_file: string | null;
  recording_status: 'attached' | 'failed' | 'not_found' | null;
  error: string | null;
  call_started_at: string;
  call_answered_at: string | null;
  call_ended_at: string | null;
}

export interface CallStats {
  totals: { total: number; inbound: number | null; outbound: number | null; answered: number | null; missed: number | null; duration: number };
  perDay: Array<{ day: string; inbound: number; outbound: number }>;
}

export interface SipAccount {
  id: string;
  display_name: string;
  sip_server: string;
  sip_domain: string | null;
  ws_port: number;
  ws_path: string;
  sip_username: string;
  sip_password: string;
  is_default: number;
  created_at: string;
}

export type SipAccountInput = Omit<SipAccount, 'id' | 'created_at' | 'is_default'> & { is_default: boolean };

export interface EventLogEntry {
  id: number;
  source: string;
  name: string;
  payload: string | null;
  created_at: string;
}

/** Settings writable through PUT /api/settings. Empty string clears a value. */
export interface SettingsPatch {
  'dial.mode'?: DialMode;
  'dial.strip_ddi'?: '1' | '0';
  'dial.prefix'?: string;
  'crm.create'?: '1' | '0';
  'microsip.exe_path'?: string;
  'microsip.recordings_dir'?: string;
  'bitrix.line_number'?: string;
  'events.enabled'?: '1' | '0';
}

export type UiEvent =
  | { type: 'dial'; callId: string; number: string; mode: DialMode }
  | { type: 'call_updated'; callId: string }
  | { type: 'status' };

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(path, {
    method,
    headers: {
      'x-voipsip': '1',
      ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `HTTP ${res.status}`, res.status, data.code);
  return data as T;
}

export const api = {
  status: () => request<Status>('GET', '/api/status'),
  updateSettings: (patch: SettingsPatch) => request<{ ok: true }>('PUT', '/api/settings', patch),

  connectBitrix: (input: { portal: string; clientId: string; clientSecret: string }) =>
    request<{ authorizeUrl: string }>('POST', '/api/bitrix/connect', input),
  sendIframeAuth: (auth: { access_token: string; refresh_token?: string; expires_in?: number; domain: string; member_id: string }) =>
    request<{ ok: true }>('POST', '/api/bitrix/iframe-auth', auth),
  resyncBitrix: () => request<{ ok: true; events: Record<string, unknown> }>('POST', '/api/bitrix/resync'),
  disconnectBitrix: () => request<{ ok: true }>('POST', '/api/bitrix/disconnect'),

  configureMicroSip: () => request<{ ok: boolean; file?: string; error?: string }>('POST', '/api/microsip/configure'),
  testDial: (number: string) => request<{ ok: boolean; error?: string }>('POST', '/api/microsip/test-dial', { number }),

  calls: (limit = 100) => request<CallLog[]>('GET', `/api/calls?limit=${limit}`),
  callStats: (days = 7) => request<CallStats>('GET', `/api/calls/stats?days=${days}`),
  softphoneCallStarted: (number: string, direction: CallDirection) =>
    request<CallLog>('POST', '/api/calls/softphone', { number, direction }),
  callAnswered: (id: string) => request<{ ok: true }>('POST', `/api/calls/${id}/answered`),
  callEnded: (id: string) => request<CallLog>('POST', `/api/calls/${id}/ended`),
  uploadRecording: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<CallLog>('POST', `/api/calls/${id}/recording`, form);
  },

  sipAccounts: () => request<SipAccount[]>('GET', '/api/sip-accounts'),
  createSipAccount: (input: SipAccountInput) => request<SipAccount>('POST', '/api/sip-accounts', input),
  updateSipAccount: (id: string, input: Partial<SipAccountInput>) => request<SipAccount>('PUT', `/api/sip-accounts/${id}`, input),
  deleteSipAccount: (id: string) => request<{ ok: true }>('DELETE', `/api/sip-accounts/${id}`),

  eventLog: () => request<EventLogEntry[]>('GET', '/api/event-log'),
};

/** Live updates from the server (Server-Sent Events). Returns an unsubscribe function. */
export function subscribe(onEvent: (event: UiEvent) => void): () => void {
  const source = new EventSource('/api/stream');
  source.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data));
    } catch {
      /* ignore malformed */
    }
  };
  return () => source.close();
}

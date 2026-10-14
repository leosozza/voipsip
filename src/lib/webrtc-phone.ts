import { Invitation, type Session } from 'sip.js';
import { SessionManager } from 'sip.js/lib/platform/web/session-manager';
import { api, type SipAccount } from '@/lib/api';

/**
 * Built-in WebRTC softphone (sip.js) for PBXs that accept SIP over WebSocket.
 * Mirrors what the MicroSIP hooks do: every call is reported to the local server,
 * which registers/finishes it in Bitrix24.
 */

export type RegistrationState = 'disconnected' | 'connecting' | 'registered' | 'error';
export type CallPhase = 'incoming' | 'dialing' | 'active';

export interface PhoneState {
  registration: RegistrationState;
  registrationError: string | null;
  call: {
    phase: CallPhase;
    number: string;
    direction: 'inbound' | 'outbound';
    callLogId: string | null;
    answeredAt: number | null;
    muted: boolean;
    held: boolean;
  } | null;
}

type Listener = (state: PhoneState) => void;

export function wsUrl(account: Pick<SipAccount, 'sip_server' | 'ws_port' | 'ws_path'>): string {
  const path = account.ws_path?.startsWith('/') ? account.ws_path : `/${account.ws_path || 'ws'}`;
  return `wss://${account.sip_server}:${account.ws_port}${path}`;
}

export class WebRtcPhone {
  private manager: SessionManager | null = null;
  private session: Session | null = null;
  private listeners = new Set<Listener>();
  private domain = '';
  /** Resolves to the server-side call log id; the server call may still be in flight when the call is answered. */
  private callLog: Promise<string | null> = Promise.resolve(null);
  state: PhoneState = { registration: 'disconnected', registrationError: null, call: null };

  constructor(private remoteAudio: HTMLAudioElement) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private set(patch: Partial<PhoneState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  private setCall(patch: Partial<NonNullable<PhoneState['call']>> | null) {
    this.set({ call: patch === null ? null : { ...this.state.call!, ...patch } });
  }

  async connect(account: SipAccount): Promise<void> {
    await this.disconnect();
    this.domain = account.sip_domain || account.sip_server;
    this.set({ registration: 'connecting', registrationError: null });

    const manager = new SessionManager(wsUrl(account), {
      aor: `sip:${account.sip_username}@${this.domain}`,
      media: { constraints: { audio: true, video: false }, remote: { audio: this.remoteAudio } },
      userAgentOptions: {
        authorizationUsername: account.sip_username,
        authorizationPassword: account.sip_password,
        displayName: account.display_name,
      },
      registrationRetry: true,
      reconnectionAttempts: 10,
      delegate: {
        onRegistered: () => this.set({ registration: 'registered', registrationError: null }),
        onUnregistered: () => this.set({ registration: 'disconnected' }),
        onServerDisconnect: (error) =>
          this.set({ registration: error ? 'error' : 'disconnected', registrationError: error?.message ?? null }),
        onCallReceived: (session) => void this.onIncoming(session),
        onCallAnswered: () => void this.onAnswered(),
        onCallHangup: () => void this.onHangup(),
        onCallHold: (_session, held) => this.state.call && this.setCall({ held }),
      },
    });
    this.manager = manager;

    try {
      await manager.connect();
      await manager.register();
    } catch (err) {
      this.set({ registration: 'error', registrationError: (err as Error).message });
    }
  }

  async disconnect(): Promise<void> {
    if (!this.manager) return;
    try {
      await this.manager.unregister();
      await this.manager.disconnect();
    } catch {
      /* already gone */
    }
    this.manager = null;
    this.set({ registration: 'disconnected' });
  }

  /** Dial a number. Pass callLogId when the call was already created by a Bitrix24 click. */
  async dial(number: string, callLogId: string | null = null): Promise<void> {
    if (!this.manager || this.session) return;
    this.set({
      call: { phase: 'dialing', number, direction: 'outbound', callLogId, answeredAt: null, muted: false, held: false },
    });
    this.trackCallLog(callLogId ? Promise.resolve(callLogId) : api.softphoneCallStarted(number, 'outbound').then((log) => log.id));
    try {
      this.session = await this.manager.call(`sip:${number}@${this.domain}`);
    } catch (err) {
      await this.reportEnded();
      this.set({ call: null });
      throw err;
    }
  }

  private async onIncoming(session: Session) {
    if (this.session) {
      // One call at a time: reject call waiting.
      await this.manager?.decline(session).catch(() => {});
      return;
    }
    this.session = session;
    const number = session instanceof Invitation ? session.remoteIdentity.uri.user || '' : '';
    this.set({
      call: { phase: 'incoming', number, direction: 'inbound', callLogId: null, answeredAt: null, muted: false, held: false },
    });
    this.trackCallLog(api.softphoneCallStarted(number, 'inbound').then((log) => log.id));
  }

  private trackCallLog(id: Promise<string>) {
    this.callLog = id.catch(() => null);
    void this.callLog.then((callLogId) => this.state.call && callLogId && this.setCall({ callLogId }));
  }

  async answer() {
    if (this.manager && this.session) await this.manager.answer(this.session);
  }

  async hangup() {
    if (!this.manager || !this.session) return;
    if (this.state.call?.phase === 'incoming') await this.manager.decline(this.session);
    else await this.manager.hangup(this.session);
  }

  toggleMute() {
    if (!this.manager || !this.session || !this.state.call) return;
    const muted = !this.state.call.muted;
    if (muted) this.manager.mute(this.session);
    else this.manager.unmute(this.session);
    this.setCall({ muted });
  }

  async toggleHold() {
    if (!this.manager || !this.session || !this.state.call) return;
    if (this.state.call.held) await this.manager.unhold(this.session);
    else await this.manager.hold(this.session);
  }

  async sendDtmf(tone: string) {
    if (this.manager && this.session) await this.manager.sendDTMF(this.session, tone);
  }

  private async onAnswered() {
    this.setCall({ phase: 'active', answeredAt: Date.now() });
    const id = await this.callLog;
    if (id) await api.callAnswered(id).catch(() => {});
  }

  private async onHangup() {
    this.session = null;
    await this.reportEnded();
    this.set({ call: null });
  }

  private async reportEnded() {
    const id = await this.callLog;
    this.callLog = Promise.resolve(null);
    if (id) await api.callEnded(id).catch(() => {});
  }
}

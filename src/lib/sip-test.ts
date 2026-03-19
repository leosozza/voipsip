import { UserAgent, Registerer, RegistererState } from 'sip.js';
import type { SipAccount } from '@/types/voip';

export interface SipTestResult {
  success: boolean;
  message: string;
  durationMs: number;
}

export async function testSipConnection(account: SipAccount, timeoutMs = 8000): Promise<SipTestResult> {
  const start = Date.now();
  const domain = account.sip_domain || account.sip_server;
  const wsScheme = account.transport === 'wss' ? 'wss' : 'ws';
  const wsUri = `${wsScheme}://${account.sip_server}:${account.ws_port}`;

  return new Promise<SipTestResult>((resolve) => {
    let settled = false;
    const finish = (result: SipTestResult) => {
      if (settled) return;
      settled = true;
      try { registerer?.dispose(); } catch {}
      try { ua?.stop(); } catch {}
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ success: false, message: `Timeout: servidor não respondeu em ${timeoutMs / 1000}s`, durationMs: Date.now() - start });
    }, timeoutMs);

    let ua: UserAgent | undefined;
    let registerer: Registerer | undefined;

    try {
      ua = new UserAgent({
        uri: UserAgent.makeURI(`sip:${account.sip_username}@${domain}`),
        transportOptions: { server: wsUri },
        authorizationUsername: account.sip_username,
        authorizationPassword: account.sip_password,
        displayName: account.display_name,
        logLevel: 'error',
      });

      ua.start().then(() => {
        registerer = new Registerer(ua!, { expires: 60 });

        registerer.stateChange.addListener((state) => {
          clearTimeout(timer);
          if (state === RegistererState.Registered) {
            finish({ success: true, message: 'Registro SIP bem-sucedido', durationMs: Date.now() - start });
          } else if (state === RegistererState.Unregistered) {
            // Could be after successful unregister, ignore if already resolved
          } else if (state === RegistererState.Terminated) {
            finish({ success: false, message: 'Registro recusado pelo servidor', durationMs: Date.now() - start });
          }
        });

        registerer.register().catch((err) => {
          clearTimeout(timer);
          finish({ success: false, message: `Falha no registro: ${err.message || err}`, durationMs: Date.now() - start });
        });
      }).catch((err) => {
        clearTimeout(timer);
        finish({ success: false, message: `Falha na conexão WebSocket: ${err.message || err}`, durationMs: Date.now() - start });
      });
    } catch (err: any) {
      clearTimeout(timer);
      finish({ success: false, message: `Erro: ${err.message || err}`, durationMs: Date.now() - start });
    }
  });
}

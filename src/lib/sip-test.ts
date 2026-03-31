import type { SipAccount } from '@/types/voip';

export interface SipTestResult {
  success: boolean;
  message: string;
  durationMs: number;
}

/**
 * Tests SIP protocol handler (MicroSIP) by attempting to open a sip: URI.
 * Detects if the browser/OS has a registered handler for the sip: protocol.
 */
export async function testSipConnection(account: SipAccount, timeoutMs = 5000): Promise<SipTestResult> {
  const start = Date.now();
  const domain = account.sip_domain || account.sip_server;
  const testUri = `sip:test@${domain}`;

  return new Promise<SipTestResult>((resolve) => {
    let settled = false;
    const finish = (result: SipTestResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    // Listen for window blur — if the browser opens an external app (MicroSIP), it blurs
    const onBlur = () => {
      clearTimeout(timer);
      window.removeEventListener('blur', onBlur);
      finish({
        success: true,
        message: 'MicroSIP respondeu ao protocolo SIP',
        durationMs: Date.now() - start,
      });
    };

    window.addEventListener('blur', onBlur);

    const timer = setTimeout(() => {
      window.removeEventListener('blur', onBlur);
      finish({
        success: false,
        message: 'MicroSIP não detectado. Verifique se está instalado e associado ao protocolo SIP.',
        durationMs: Date.now() - start,
      });
    }, timeoutMs);

    // Try to open the sip: URI via a hidden iframe to avoid navigating away
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = testUri;
      document.body.appendChild(iframe);
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch {}
      }, 2000);
    } catch {
      // Fallback: direct navigation
      try {
        window.location.href = testUri;
      } catch (err: any) {
        clearTimeout(timer);
        window.removeEventListener('blur', onBlur);
        finish({
          success: false,
          message: `Erro ao abrir protocolo SIP: ${err.message || err}`,
          durationMs: Date.now() - start,
        });
      }
    }
  });
}

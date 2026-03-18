/**
 * Shared utility for resolving Bitrix24 context in iframe pages.
 */

declare global {
  interface Window {
    BX24?: {
      init: (callback: () => void) => void;
      fitWindow: () => void;
      getAuth: () => { domain: string; member_id: string; access_token: string } | null;
      getDomain: () => string;
      isAdmin: () => boolean;
    };
  }
}

export interface BitrixContext {
  domain: string;
  memberId: string;
}

function getParam(params: URLSearchParams, ...keys: string[]): string {
  for (const k of keys) {
    const v = params.get(k);
    if (v) return v;
  }
  return '';
}

export function loadBX24Script(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.BX24) { resolve(); return; }
    const script = document.createElement('script');
    script.src = '//api.bitrix24.com/api/v1/';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load BX24 SDK'));
    document.head.appendChild(script);
  });
}

/**
 * Resolve Bitrix context from query params + BX24 SDK.
 * Returns domain and memberId with multiple fallbacks.
 */
export async function resolveBitrixContext(searchParams: URLSearchParams): Promise<BitrixContext> {
  let domain = getParam(searchParams, 'DOMAIN', 'domain');
  let memberId = getParam(searchParams, 'member_id', 'MEMBER_ID');

  try {
    await loadBX24Script();
    await new Promise<void>((resolve) => {
      window.BX24?.init(() => {
        window.BX24?.fitWindow();
        const auth = window.BX24?.getAuth();
        if (auth) {
          if (!domain) domain = auth.domain;
          if (!memberId) memberId = auth.member_id;
        }
        // Additional fallback for domain
        if (!domain) {
          try {
            const d = window.BX24?.getDomain?.();
            if (d) domain = d;
          } catch { /* ignore */ }
        }
        resolve();
      });
    });
  } catch {
    // BX24 SDK not available (direct access)
  }

  return { domain, memberId };
}

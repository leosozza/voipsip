/**
 * Bitrix24 JS SDK (BX24) helpers for the view shown inside the portal iframe.
 */

export interface BX24Auth {
  domain: string;
  member_id: string;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

declare global {
  interface Window {
    BX24?: {
      init: (callback: () => void) => void;
      fitWindow: () => void;
      getAuth: () => BX24Auth | false | null;
      getDomain: () => string;
      isAdmin: () => boolean;
    };
  }
}

export function loadBX24Script(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.BX24) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://api.bitrix24.com/api/v1/';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Não foi possível carregar o SDK do Bitrix24'));
    document.head.appendChild(script);
  });
}

/** Loads BX24 and waits for init. Resolves to the portal auth, or null when not inside Bitrix24. */
export async function initBX24(timeoutMs = 4000): Promise<BX24Auth | null> {
  await loadBX24Script();
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    window.BX24?.init(() => {
      window.clearTimeout(timer);
      window.BX24?.fitWindow();
      resolve(window.BX24?.getAuth() || null);
    });
  });
}

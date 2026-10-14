import { createContext, useContext } from 'react';
import type { SipAccount } from '@/lib/api';
import type { PhoneState, WebRtcPhone } from '@/lib/webrtc-phone';

export interface PhoneContextValue {
  /** The single softphone instance (null until mounted). */
  phone: WebRtcPhone | null;
  state: PhoneState;
  /** True when the dial mode is "webrtc". */
  enabled: boolean;
  account: SipAccount | null;
}

export const PhoneContext = createContext<PhoneContextValue | null>(null);

export function usePhone(): PhoneContextValue {
  const ctx = useContext(PhoneContext);
  if (!ctx) throw new Error('usePhone deve ser usado dentro de <PhoneProvider>');
  return ctx;
}

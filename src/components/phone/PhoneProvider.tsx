import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { WebRtcPhone, type PhoneState } from '@/lib/webrtc-phone';
import { PhoneContext } from '@/hooks/usePhone';
import { useStatus } from '@/hooks/useStatus';
import { pickDefaultAccount, useSipAccounts } from '@/hooks/useSipAccounts';
import { useLiveEvents } from '@/hooks/useLiveEvents';

const INITIAL_STATE: PhoneState = { registration: 'disconnected', registrationError: null, call: null };

/**
 * Owns the app's single WebRTC softphone and the live event stream.
 * Registers with the default SIP account while the dial mode is "webrtc".
 */
export function PhoneProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [phone, setPhone] = useState<WebRtcPhone | null>(null);
  const [state, setState] = useState<PhoneState>(INITIAL_STATE);
  const { data: status } = useStatus();
  const { data: accounts } = useSipAccounts();

  const enabled = status?.dial.mode === 'webrtc';
  const account = pickDefaultAccount(accounts);
  const accountRef = useRef(account);
  accountRef.current = account;

  useEffect(() => {
    if (!audioRef.current) return;
    const instance = new WebRtcPhone(audioRef.current);
    const unsubscribe = instance.subscribe(setState);
    setPhone(instance);
    return () => {
      unsubscribe();
      void instance.disconnect();
    };
  }, []);

  // Reconnect whenever the mode or any registration-relevant field of the account changes.
  const registrationKey =
    enabled && account
      ? [account.id, account.sip_server, account.sip_domain, account.ws_port, account.ws_path, account.sip_username, account.sip_password, account.display_name].join('|')
      : null;

  useEffect(() => {
    if (!phone) return;
    if (registrationKey && accountRef.current) void phone.connect(accountRef.current);
    else void phone.disconnect();
  }, [phone, registrationKey]);

  useLiveEvents((event) => {
    if (event.mode === 'microsip') {
      toast(`Discando ${event.number} no MicroSIP`);
      return;
    }
    if (!phone || phone.state.registration !== 'registered') {
      toast.error(`Não foi possível discar ${event.number}`, { description: 'O softphone embutido não está registrado.' });
      return;
    }
    phone.dial(event.number, event.callId).catch((err: Error) => toast.error('Falha ao discar', { description: err.message }));
  });

  const value = useMemo(() => ({ phone, state, enabled, account }), [phone, state, enabled, account]);

  return (
    <PhoneContext.Provider value={value}>
      {children}
      {/* Remote party audio for the WebRTC softphone. */}
      <audio ref={audioRef} autoPlay hidden />
    </PhoneContext.Provider>
  );
}

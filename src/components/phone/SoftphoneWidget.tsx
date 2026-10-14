import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/common/Status';
import { ActiveCall, IdleDialer, IncomingCall } from '@/components/phone/CallPanels';
import { usePhone } from '@/hooks/usePhone';
import { REGISTRATION } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Floating built-in softphone (bottom-right). Rendered only in WebRTC mode. */
export function SoftphoneWidget() {
  const { phone, state, enabled, account } = usePhone();
  const [open, setOpen] = useState(false);
  const phase = state.call?.phase;

  // Pop the widget open whenever a call starts or rings.
  useEffect(() => {
    if (phase) setOpen(true);
  }, [phase]);

  if (!enabled || !phone) return null;

  const reg = REGISTRATION[state.registration];
  const registered = state.registration === 'registered';
  const position = 'fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6';

  if (!open) {
    return (
      <Button
        className={cn(position, 'h-14 w-14 rounded-full shadow-lg', phase === 'incoming' && 'motion-safe:animate-bounce')}
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={`Abrir softphone (${reg.label})`}
        aria-expanded={false}
      >
        <Phone className="h-6 w-6" />
        <StatusDot tone={reg.tone} className="absolute right-1 top-1 h-3 w-3 ring-2 ring-primary" />
      </Button>
    );
  }

  return (
    <section
      className={cn(position, 'w-[min(320px,calc(100vw-2rem))] rounded-xl border bg-card text-card-foreground shadow-xl')}
      aria-label="Softphone"
    >
      <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Softphone</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <StatusDot tone={reg.tone} pulse={state.registration === 'connecting'} />
            {reg.label}
            {account && <span className="truncate">· {account.sip_username}</span>}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOpen(false)} aria-label="Minimizar softphone" aria-expanded>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </header>

      <div className="max-h-[70vh] overflow-y-auto p-4">
        {state.call?.phase === 'incoming' ? (
          <IncomingCall call={state.call} phone={phone} />
        ) : state.call ? (
          <ActiveCall call={state.call} phone={phone} />
        ) : !account ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma conta SIP cadastrada.{' '}
            <Link to="/settings" className="font-medium text-foreground underline underline-offset-4">
              Cadastre uma conta
            </Link>{' '}
            para usar o softphone.
          </p>
        ) : (
          <>
            {state.registrationError && (
              <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                {state.registrationError}
              </p>
            )}
            <IdleDialer phone={phone} registered={registered} />
          </>
        )}
      </div>
    </section>
  );
}

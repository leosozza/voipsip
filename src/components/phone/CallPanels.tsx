import { useState, type FormEvent, type ReactNode } from 'react';
import { Delete, Grid3x3, Mic, MicOff, Pause, Phone, PhoneIncoming, PhoneOff, PhoneOutgoing, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialPad } from '@/components/phone/DialPad';
import { CallTimer } from '@/components/phone/CallTimer';
import type { PhoneState, WebRtcPhone } from '@/lib/webrtc-phone';
import { cn } from '@/lib/utils';

type Call = NonNullable<PhoneState['call']>;

const fail = (title: string) => (err: unknown) => toast.error(title, { description: err instanceof Error ? err.message : String(err) });

export function IncomingCall({ call, phone }: { call: Call; phone: WebRtcPhone }) {
  return (
    <div className="space-y-5 py-2 text-center" role="alert" aria-live="assertive">
      <div>
        <PhoneIncoming className="mx-auto mb-2 h-8 w-8 text-success motion-safe:animate-pulse" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Chamada recebida</p>
        <p className="mt-1 break-all font-mono text-2xl font-semibold">{call.number || 'Número oculto'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" variant="destructive" className="h-14" onClick={() => phone.hangup().catch(fail('Falha ao recusar'))}>
          <PhoneOff className="mr-2 h-5 w-5" aria-hidden="true" />
          Recusar
        </Button>
        <Button
          size="lg"
          className="h-14 bg-success text-success-foreground hover:bg-success/90"
          onClick={() => phone.answer().catch(fail('Falha ao atender'))}
          autoFocus
        >
          <Phone className="mr-2 h-5 w-5" aria-hidden="true" />
          Atender
        </Button>
      </div>
    </div>
  );
}

function ControlButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'outline'}
      className={cn('h-12 flex-col gap-0.5 px-1 text-[11px] font-normal', active && 'ring-2 ring-ring')}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
      {label}
    </Button>
  );
}

export function ActiveCall({ call, phone }: { call: Call; phone: WebRtcPhone }) {
  const [showPad, setShowPad] = useState(false);
  const [tones, setTones] = useState('');
  const inbound = call.direction === 'inbound';
  const DirectionIcon = inbound ? PhoneIncoming : PhoneOutgoing;

  const sendTone = (key: string) => {
    setTones((t) => (t + key).slice(-16));
    phone.sendDtmf(key).catch(fail('Falha ao enviar tom'));
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <DirectionIcon className="h-4 w-4" aria-hidden="true" />
          {inbound ? 'Recebida' : 'Realizada'}
          {call.held && <span className="font-medium text-warning-foreground dark:text-warning">· Em espera</span>}
        </p>
        <p className="mt-1 break-all font-mono text-2xl font-semibold">{call.number}</p>
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          {call.answeredAt ? <CallTimer since={call.answeredAt} /> : 'Chamando…'}
        </p>
      </div>

      {showPad && (
        <div className="space-y-2">
          <p className="h-5 text-center font-mono text-sm tracking-widest text-muted-foreground" aria-live="polite">
            {tones}
          </p>
          <DialPad onPress={sendTone} disabled={!call.answeredAt} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <ControlButton label={call.muted ? 'Ativar mic.' : 'Mudo'} active={call.muted} onClick={() => phone.toggleMute()}>
          {call.muted ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
        </ControlButton>
        <ControlButton label={call.held ? 'Retomar' : 'Espera'} active={call.held} onClick={() => phone.toggleHold().catch(fail('Falha ao colocar em espera'))}>
          {call.held ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
        </ControlButton>
        <ControlButton label="Teclado" active={showPad} onClick={() => setShowPad((v) => !v)}>
          <Grid3x3 className="h-4 w-4" aria-hidden="true" />
        </ControlButton>
      </div>

      <Button variant="destructive" size="lg" className="h-12 w-full" onClick={() => phone.hangup().catch(fail('Falha ao desligar'))}>
        <PhoneOff className="mr-2 h-5 w-5" aria-hidden="true" />
        Desligar
      </Button>
    </div>
  );
}

export function IdleDialer({ phone, registered }: { phone: WebRtcPhone; registered: boolean }) {
  const [number, setNumber] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const target = number.trim();
    if (!target || !registered) return;
    phone.dial(target).then(() => setNumber(''), fail('Falha ao discar'));
  };

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="flex gap-2">
        <Input
          aria-label="Número para discar"
          inputMode="tel"
          autoComplete="off"
          placeholder="Digite o número"
          className="font-mono text-base"
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/[^\d*#+]/g, ''))}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Apagar último dígito"
          disabled={!number}
          onClick={() => setNumber((n) => n.slice(0, -1))}
        >
          <Delete className="h-4 w-4" />
        </Button>
      </div>
      <DialPad onPress={(key) => setNumber((n) => n + key)} />
      <Button type="submit" size="lg" className="h-12 w-full bg-success text-success-foreground hover:bg-success/90" disabled={!registered || !number.trim()}>
        <Phone className="mr-2 h-5 w-5" aria-hidden="true" />
        Ligar
      </Button>
    </form>
  );
}

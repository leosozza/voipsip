import { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCallSync } from '@/hooks/useCallSync';
import type { SipAccount, SipRegistrationState, CallState } from '@/types/voip';
import { stripBrazilDDI } from '@/lib/utils';

interface SoftphoneProps {
  sipAccount: SipAccount | null;
  bitrixUserId?: string;
  onCallStart?: (phoneNumber: string) => void;
  onCallEnd?: (duration: number) => void;
}

const dialPad = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

export function Softphone({ sipAccount, bitrixUserId, onCallStart, onCallEnd }: SoftphoneProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [registrationState, setRegistrationState] = useState<SipRegistrationState>('unregistered');
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentBitrixCallId, setCurrentBitrixCallId] = useState<string | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const { registerCall, finishCall } = useCallSync();

  useEffect(() => {
    if (!sipAccount) {
      setRegistrationState('unregistered');
      return;
    }
    setRegistrationState('registering');
    const timer = setTimeout(() => setRegistrationState('registered'), 1500);
    return () => clearTimeout(timer);
  }, [sipAccount]);

  const startCallTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    callTimerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
    setCallDuration(0);
    return duration;
  }, []);

  const handleCall = useCallback(async () => {
    if (!phoneNumber.trim() || callState !== 'idle') return;

    setCallState('calling');
    onCallStart?.(phoneNumber);

    // Register in Bitrix24
    const bitrixCallId = await registerCall({
      phoneNumber,
      direction: 'outbound',
      bitrixUserId,
    });
    if (bitrixCallId) setCurrentBitrixCallId(bitrixCallId);

    // Open SIP URI for external dialer
    if (sipAccount) {
      const domain = sipAccount.sip_domain || sipAccount.sip_server;
      window.location.href = `sip:${stripBrazilDDI(phoneNumber)}@${domain}`;
    }

    setTimeout(() => {
      setCallState('answered');
      startCallTimer();
    }, 2000);
  }, [phoneNumber, callState, onCallStart, startCallTimer, registerCall, bitrixUserId, sipAccount]);

  const handleHangup = useCallback(async () => {
    const duration = stopCallTimer();
    setCallState('idle');
    setIsMuted(false);
    setIsOnHold(false);
    onCallEnd?.(duration);

    if (currentBitrixCallId) {
      await finishCall({
        bitrixCallId: currentBitrixCallId,
        duration,
        statusCode: duration > 0 ? 200 : 603,
        phoneNumber,
      });
      setCurrentBitrixCallId(null);
    }
  }, [stopCallTimer, onCallEnd, currentBitrixCallId, finishCall, phoneNumber]);

  const handleDialPadPress = useCallback((digit: string) => {
    if (callState === 'idle') {
      setPhoneNumber(prev => prev + digit);
    }
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const registrationBadge = {
    unregistered: { label: 'Desconectado', variant: 'secondary' as const },
    registering: { label: 'Conectando...', variant: 'outline' as const },
    registered: { label: 'Conectado', variant: 'default' as const },
    error: { label: 'Erro', variant: 'destructive' as const },
  };

  const regInfo = registrationBadge[registrationState];

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          {callState !== 'idle' ? (
            <PhoneOff className="h-6 w-6" />
          ) : (
            <Phone className="h-6 w-6" />
          )}
        </Button>
        {callState !== 'idle' && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold animate-pulse">
            ●
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-2xl border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Softphone</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={regInfo.variant} className="text-[10px] px-1.5 py-0">
            {regInfo.label}
          </Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(true)}>
            <Minimize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Display */}
      <div className="px-4 pt-3">
        {callState !== 'idle' ? (
          <div className="text-center space-y-1">
            <p className="text-lg font-mono font-bold">{phoneNumber}</p>
            <p className="text-sm text-muted-foreground">
              {callState === 'calling' ? 'Chamando...' : formatDuration(callDuration)}
            </p>
          </div>
        ) : (
          <Input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Digite o número"
            className="text-center font-mono text-lg h-12 border-0 bg-muted/50"
          />
        )}
      </div>

      {/* Dial pad */}
      {callState === 'idle' && (
        <div className="grid grid-cols-3 gap-1 px-4 py-3">
          {dialPad.flat().map((digit) => (
            <Button
              key={digit}
              variant="ghost"
              className="h-12 text-lg font-mono"
              onClick={() => handleDialPadPress(digit)}
            >
              {digit}
            </Button>
          ))}
        </div>
      )}

      {/* Call controls */}
      <div className="flex items-center justify-center gap-3 px-4 pb-4">
        {callState === 'idle' ? (
          <>
            {phoneNumber && (
              <Button variant="ghost" size="icon" onClick={() => setPhoneNumber('')}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={handleCall}
              disabled={!phoneNumber.trim() || registrationState !== 'registered'}
              className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700"
              size="icon"
            >
              <Phone className="h-6 w-6" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={isMuted ? 'destructive' : 'outline'}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              onClick={handleHangup}
              className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90"
              size="icon"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              variant={isOnHold ? 'secondary' : 'outline'}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setIsOnHold(!isOnHold)}
            >
              {isOnHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          </>
        )}
      </div>

      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}

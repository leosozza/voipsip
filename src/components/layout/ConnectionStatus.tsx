import { Link } from 'react-router-dom';
import { AlertTriangle, Building2, Headset } from 'lucide-react';
import { StatusDot } from '@/components/common/Status';
import { usePhone } from '@/hooks/usePhone';
import type { Status } from '@/lib/api';
import { DIAL_MODE_LABEL, REGISTRATION, type Tone } from '@/lib/format';

/** Compact Bitrix24 + softphone status line shown at the top of the app. */
export function ConnectionStatus({ status }: { status: Status }) {
  const { state, account } = usePhone();
  const { bitrix, dial, events } = status;

  let phoneTone: Tone = 'success';
  let phoneDetail = status.microsip.exe ? 'pronto' : 'executável não encontrado';
  if (dial.mode === 'microsip' && !status.microsip.exe) phoneTone = 'warning';
  if (dial.mode === 'webrtc') {
    const reg = REGISTRATION[state.registration];
    phoneTone = account ? reg.tone : 'warning';
    phoneDetail = account ? reg.label : 'sem conta SIP';
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-sm" role="status" aria-label="Status da conexão">
      <span className="flex min-w-0 items-center gap-2">
        <StatusDot tone={bitrix.connected ? 'success' : 'danger'} />
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">
          <span className="font-medium">{bitrix.domain ?? 'Bitrix24 desconectado'}</span>
          {bitrix.userName && <span className="text-muted-foreground"> · {bitrix.userName}</span>}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <StatusDot tone={phoneTone} pulse={state.registration === 'connecting' && dial.mode === 'webrtc'} />
        <Headset className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>
          <span className="font-medium">{DIAL_MODE_LABEL[dial.mode]}</span>
          <span className="text-muted-foreground"> · {phoneDetail}</span>
        </span>
      </span>
      {events.lastError && (
        <Link
          to="/logs"
          className="flex items-center gap-1.5 rounded-sm text-destructive underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Erro ao receber eventos do Bitrix24
        </Link>
      )}
    </div>
  );
}

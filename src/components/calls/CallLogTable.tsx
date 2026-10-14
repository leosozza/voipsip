import { AlertCircle, PhoneIncoming, PhoneOff, PhoneOutgoing } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToneBadge } from '@/components/common/Status';
import type { CallLog } from '@/lib/api';
import { CALL_STATUS, RECORDING_STATUS, SOURCE_LABEL, formatClock, formatDateTime } from '@/lib/format';

interface CallLogTableProps {
  calls: CallLog[] | undefined;
  isLoading?: boolean;
  emptyMessage?: string;
}

function Direction({ direction }: { direction: CallLog['direction'] }) {
  const inbound = direction === 'inbound';
  const Icon = inbound ? PhoneIncoming : PhoneOutgoing;
  return (
    <span className="inline-flex items-center" title={inbound ? 'Recebida' : 'Realizada'}>
      <Icon className={inbound ? 'h-4 w-4 text-success' : 'h-4 w-4 text-info'} aria-hidden="true" />
      <span className="sr-only">{inbound ? 'Recebida' : 'Realizada'}</span>
    </span>
  );
}

function StatusCell({ call }: { call: CallLog }) {
  const status = CALL_STATUS[call.status] ?? { label: call.status, tone: 'neutral' as const };
  return (
    <div className="flex items-center gap-1.5">
      <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
      {call.error && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="rounded-sm text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Erro: ${call.error}`}>
              <AlertCircle className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs break-words">{call.error}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function RecordingCell({ status }: { status: CallLog['recording_status'] }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const rec = RECORDING_STATUS[status];
  return <ToneBadge tone={rec.tone}>{rec.label}</ToneBadge>;
}

export function CallLogTable({ calls, isLoading, emptyMessage = 'As chamadas aparecerão aqui assim que forem feitas ou recebidas.' }: CallLogTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Carregando chamadas">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (!calls?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center">
        <PhoneOff className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">Nenhuma chamada</p>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Data/hora</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Direção</span>
            </TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Duração</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Gravação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => (
            <TableRow key={call.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(call.call_started_at)}</TableCell>
              <TableCell>
                <Direction direction={call.direction} />
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono">{call.phone_number || '—'}</TableCell>
              <TableCell>
                <StatusCell call={call} />
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{call.duration_seconds ? formatClock(call.duration_seconds) : '—'}</TableCell>
              <TableCell className="whitespace-nowrap">{SOURCE_LABEL[call.source] ?? call.source}</TableCell>
              <TableCell>
                <RecordingCell status={call.recording_status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

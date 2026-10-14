import { useState } from 'react';
import { AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CopyField } from '@/components/common/CopyField';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusDot, ToneBadge } from '@/components/common/Status';
import { useEventLog } from '@/hooks/useEventLog';
import { useStatus } from '@/hooks/useStatus';
import type { EventLogEntry, Status } from '@/lib/api';
import { formatDateTime, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

const REFRESH_MS = 5_000;

function prettyPayload(payload: string | null): string {
  if (!payload) return '';
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

function EventsStatus({ status }: { status: Status }) {
  const { events } = status;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recebimento de eventos do Bitrix24</CardTitle>
        <CardDescription>O conector consulta o Bitrix24 periodicamente para saber de cliques para ligar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Situação</dt>
            <dd className="mt-0.5 flex items-center gap-2 font-medium">
              <StatusDot tone={events.lastError ? 'danger' : events.running && events.enabled ? 'success' : 'neutral'} />
              {events.lastError ? 'Com erro' : !events.enabled ? 'Desativado' : events.running ? 'Ativo' : 'Parado'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Última consulta</dt>
            <dd className="mt-0.5 font-medium" title={formatDateTime(events.lastPollAt)}>
              {formatRelative(events.lastPollAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Último evento recebido</dt>
            <dd className="mt-0.5 font-medium" title={formatDateTime(events.lastEventAt)}>
              {formatRelative(events.lastEventAt)}
            </dd>
          </div>
        </dl>
        {events.lastError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Último erro</AlertTitle>
            <AlertDescription className="break-words font-mono text-xs">{events.lastError}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">Pasta de dados (banco, gravações e logs)</p>
          <CopyField value={status.dataDir} label="pasta de dados" />
        </div>
      </CardContent>
    </Card>
  );
}

function EventRow({ entry }: { entry: EventLogEntry }) {
  const [open, setOpen] = useState(false);
  const payload = prettyPayload(entry.payload);
  const isError = /fail|error|erro/i.test(entry.name);
  const panelId = `event-${entry.id}`;

  return (
    <>
      <TableRow className={cn(isError && 'bg-destructive/5')}>
        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(entry.created_at)}</TableCell>
        <TableCell>
          <ToneBadge tone="neutral">{entry.source}</ToneBadge>
        </TableCell>
        <TableCell className={cn('font-mono text-xs', isError && 'font-semibold text-destructive')}>{entry.name}</TableCell>
        <TableCell className="text-right">
          {payload && (
            <Button variant="ghost" size="sm" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
              <ChevronRight className={cn('mr-1 h-4 w-4 transition-transform', open && 'rotate-90')} aria-hidden="true" />
              {open ? 'Ocultar' : 'Detalhes'}
            </Button>
          )}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow id={panelId} className="hover:bg-transparent">
          <TableCell colSpan={4} className="bg-muted/40 p-0">
            <pre className="max-h-80 overflow-auto p-4 font-mono text-xs leading-relaxed">{payload}</pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function Logs() {
  const status = useStatus(REFRESH_MS);
  const log = useEventLog(REFRESH_MS);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnóstico"
        description="Eventos recentes do conector. Atualiza a cada 5 segundos."
        actions={
          <Button variant="outline" size="sm" onClick={() => void Promise.all([status.refetch(), log.refetch()])} disabled={log.isFetching}>
            <RefreshCw className={cn('mr-2 h-4 w-4', log.isFetching && 'animate-spin')} aria-hidden="true" />
            Atualizar
          </Button>
        }
      />

      {status.data ? <EventsStatus status={status.data} /> : <Skeleton className="h-48 w-full" />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro de eventos</CardTitle>
          <CardDescription>Últimos 200 eventos: cliques do Bitrix24, hooks do MicroSIP, chamadas e erros.</CardDescription>
        </CardHeader>
        <CardContent>
          {log.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !log.data?.length ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horário</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Detalhes</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.data.map((entry) => (
                    <EventRow key={entry.id} entry={entry} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

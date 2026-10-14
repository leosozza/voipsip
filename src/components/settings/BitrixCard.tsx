import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Link2, Loader2, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ToneBadge } from '@/components/common/Status';
import { api, type Status } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import type { SetupLocationState } from '@/lib/setup-route';

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:text-right">{children}</dd>
    </div>
  );
}

export function BitrixCard({ status }: { status: Status }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { bitrix } = status;
  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: queryKeys.status });

  const resync = useMutation({
    mutationFn: api.resyncBitrix,
    onSuccess: () => toast.success('Linha e eventos ressincronizados com o Bitrix24'),
    onError: (err) => toast.error('Falha ao ressincronizar', { description: errorMessage(err) }),
    onSettled: refreshStatus,
  });

  const disconnect = useMutation({
    mutationFn: api.disconnectBitrix,
    onSuccess: () => toast.success('Bitrix24 desconectado'),
    onError: (err) => toast.error('Falha ao desconectar', { description: errorMessage(err) }),
    onSettled: refreshStatus,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Bitrix24
        </CardTitle>
        <CardDescription>Portal conectado a este computador.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-3">
          <Row label="Portal">{bitrix.domain ?? '—'}</Row>
          <Row label="Usuário">
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              {bitrix.userName ?? '—'}
              {bitrix.userId && <span className="font-normal text-muted-foreground">(ID {bitrix.userId})</span>}
              {bitrix.isAdmin && <ToneBadge tone="info">Administrador</ToneBadge>}
            </span>
          </Row>
          <Row label="Linha externa">{bitrix.lineNumber ? `VoipSip ${bitrix.lineNumber}` : '—'}</Row>
          <Row label="Token expira em">{formatDateTime(bitrix.tokenExpiresAt)}</Row>
        </dl>

        {!bitrix.canRefresh && (
          <Alert className="border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 !text-warning" aria-hidden="true" />
            <AlertTitle>Renovação automática indisponível</AlertTitle>
            <AlertDescription>
              Não há chaves do aplicativo local salvas, então o acesso vai expirar. Clique em Reconectar e informe o client_id e o client_secret.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
        <Button variant="outline" onClick={() => navigate('/setup', { state: { step: 2 } satisfies SetupLocationState })}>
          <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Reconectar
        </Button>
        <Button variant="outline" onClick={() => resync.mutate()} disabled={resync.isPending}>
          {resync.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
          Ressincronizar linha e eventos
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:ml-auto">
              <Unplug className="mr-2 h-4 w-4" aria-hidden="true" />
              Desconectar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desconectar do Bitrix24?</AlertDialogTitle>
              <AlertDialogDescription>
                O conector deixará de receber cliques e de registrar chamadas em {bitrix.domain}. O histórico local é mantido. Para voltar, será
                preciso conectar novamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={() => disconnect.mutate()}>
                Desconectar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

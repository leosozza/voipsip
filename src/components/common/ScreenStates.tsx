import { Loader2, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoadingScreen({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-1 items-center justify-center" role="status">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Shown when the local connector does not answer (server stopped or crashed). */
export function ServerUnavailable({ error, onRetry }: { error?: unknown; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md space-y-4 text-center">
        <ServerCrash className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
        <h1 className="text-xl font-semibold">Conector local indisponível</h1>
        <p className="text-sm text-muted-foreground">
          Não foi possível falar com o serviço do VoipSip neste computador. Verifique se o aplicativo está aberto e tente novamente.
        </p>
        {error instanceof Error && <p className="font-mono text-xs text-muted-foreground">{error.message}</p>}
        <Button onClick={onRetry}>Tentar novamente</Button>
      </div>
    </div>
  );
}

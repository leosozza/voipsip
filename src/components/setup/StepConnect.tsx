import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, type Status } from '@/lib/api';

/** Accepts "https://empresa.bitrix24.com.br/crm/" and returns "empresa.bitrix24.com.br". */
const normalizePortal = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');

export function StepConnect({ status, error }: { status: Status; error?: string | null }) {
  const [portal, setPortal] = useState(status.bitrix.domain ?? '');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const connect = useMutation({
    mutationFn: () => api.connectBitrix({ portal: normalizePortal(portal), clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
    // Bitrix24 asks the user to authorize the app and redirects back to /?connected=1 (or ?connect_error=...).
    onSuccess: ({ authorizeUrl }) => {
      window.location.href = authorizeUrl;
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    connect.mutate();
  };

  const shownError = connect.error instanceof Error ? connect.error.message : error;
  const redirecting = connect.isPending || connect.isSuccess;

  return (
    <form className="space-y-5" onSubmit={submit}>
      {status.bitrix.connected && (
        <Alert className="border-success/40 bg-success/10">
          <CheckCircle2 className="h-4 w-4 !text-success" aria-hidden="true" />
          <AlertTitle>Já conectado a {status.bitrix.domain}</AlertTitle>
          <AlertDescription>Preencha os campos abaixo apenas se quiser reconectar ou trocar de portal.</AlertDescription>
        </Alert>
      )}

      {shownError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Não foi possível conectar</AlertTitle>
          <AlertDescription>{shownError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="portal">Endereço do seu Bitrix24</Label>
        <Input
          id="portal"
          required
          autoComplete="url"
          placeholder="minhaempresa.bitrix24.com.br"
          value={portal}
          onChange={(e) => setPortal(e.target.value)}
          aria-describedby="portal-hint"
        />
        <p id="portal-hint" className="text-xs text-muted-foreground">
          O endereço que aparece no navegador quando você abre o Bitrix24.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="client-id">Código do aplicativo (client_id)</Label>
          <Input id="client-id" required autoComplete="off" placeholder="local.xxxxxxxx.xxxxxxxx" className="font-mono text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-secret">Chave do aplicativo (client_secret)</Label>
          <Input
            id="client-secret"
            type="password"
            required
            autoComplete="off"
            className="font-mono text-sm"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Você será levado ao Bitrix24 para autorizar o aplicativo e voltará aqui automaticamente.
        </p>
        <Button type="submit" disabled={redirecting} className="shrink-0">
          {redirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />}
          {redirecting ? 'Abrindo o Bitrix24…' : 'Conectar ao Bitrix24'}
        </Button>
      </div>
    </form>
  );
}

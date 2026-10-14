import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, PhoneOutgoing, Wand2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToneBadge } from '@/components/common/Status';
import { useUpdateSettings } from '@/hooks/useStatus';
import { api, type Status } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Detected MicroSIP executable, or a field to point to it. */
export function MicroSipExeField({ status, alwaysEditable }: { status: Status; alwaysEditable?: boolean }) {
  const [path, setPath] = useState('');
  const update = useUpdateSettings();
  const exe = status.microsip.exe;

  const save = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { 'microsip.exe_path': path.trim() },
      {
        onSuccess: () => {
          toast.success(path.trim() ? 'Caminho do MicroSIP salvo' : 'Usando detecção automática do MicroSIP');
          setPath('');
        },
        onError: (err) => toast.error('Não foi possível salvar', { description: errorMessage(err) }),
      },
    );
  };

  return (
    <div className="space-y-2">
      <p className="flex items-start gap-2 text-sm">
        {exe ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        )}
        <span>
          {exe ? 'MicroSIP encontrado: ' : 'MicroSIP não encontrado neste computador.'}
          {exe && <code className="break-all rounded bg-muted px-1 py-0.5 text-xs">{exe}</code>}
        </span>
      </p>
      {status.microsip.exePathSetting && status.microsip.exePathSetting !== exe && (
        <p className="text-xs text-destructive">
          O caminho salvo não existe: <code className="break-all">{status.microsip.exePathSetting}</code>
        </p>
      )}
      {(!exe || alwaysEditable) && (
        <form className="space-y-1.5" onSubmit={save}>
          <Label htmlFor="microsip-exe">Caminho do microsip.exe</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="microsip-exe"
              placeholder={exe ?? 'C:\\Program Files\\MicroSIP\\microsip.exe'}
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="font-mono text-sm"
            />
            <Button type="submit" variant="outline" disabled={update.isPending}>
              {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Salvar caminho
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Deixe em branco e salve para voltar à detecção automática.</p>
        </form>
      )}
    </div>
  );
}

/** Writes the call-event hooks into microsip.ini. */
export function ConfigureMicroSip({ status }: { status: Status }) {
  const queryClient = useQueryClient();
  const { ini } = status.microsip;
  const configure = useMutation({
    mutationFn: api.configureMicroSip,
    onSuccess: (res) => {
      if (res.ok) toast.success('MicroSIP configurado', { description: res.file ? `Arquivo: ${res.file}` : undefined });
      else toast.error('Não foi possível configurar o MicroSIP', { description: res.error });
    },
    onError: (err) => toast.error('Não foi possível configurar o MicroSIP', { description: errorMessage(err) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.status }),
  });

  return (
    <div className="space-y-3">
      <Alert className="border-warning/50 bg-warning/10">
        <AlertTriangle className="h-4 w-4 !text-warning" aria-hidden="true" />
        <AlertTitle>Feche o MicroSIP antes</AlertTitle>
        <AlertDescription>
          O MicroSIP regrava o arquivo de configuração ao sair. Feche-o (inclusive na bandeja do Windows), clique no botão abaixo e abra-o novamente.
        </AlertDescription>
      </Alert>
      <Button onClick={() => configure.mutate()} disabled={configure.isPending}>
        {configure.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />}
        Configurar MicroSIP automaticamente
      </Button>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">Arquivo de configuração</dt>
        <dd className="break-all font-mono text-xs leading-5">{ini.file ?? 'não encontrado'}</dd>
        <dt className="text-muted-foreground">Integração (hooks)</dt>
        <dd>
          <ToneBadge tone={ini.hooksConfigured ? 'success' : 'warning'}>{ini.hooksConfigured ? 'Configurada' : 'Não configurada'}</ToneBadge>
        </dd>
      </dl>
    </div>
  );
}

/** Asks the server to start a call in MicroSIP. */
export function TestDial() {
  const [number, setNumber] = useState('');
  const dial = useMutation({
    mutationFn: (n: string) => api.testDial(n),
    onSuccess: (res, n) =>
      res.ok ? toast.success(`Discando ${n} no MicroSIP`) : toast.error('Falha na discagem de teste', { description: res.error }),
    onError: (err) => toast.error('Falha na discagem de teste', { description: errorMessage(err) }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (number.trim()) dial.mutate(number.trim());
  };

  return (
    <form className="space-y-1.5" onSubmit={submit}>
      <Label htmlFor="test-dial">Testar discagem</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id="test-dial" inputMode="tel" placeholder="Ex.: 11999990000" value={number} onChange={(e) => setNumber(e.target.value)} className="font-mono" />
        <Button type="submit" variant="outline" disabled={dial.isPending || !number.trim()}>
          {dial.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <PhoneOutgoing className="mr-2 h-4 w-4" aria-hidden="true" />}
          Discar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">O MicroSIP deve abrir e iniciar a chamada para este número.</p>
    </form>
  );
}

import { useState, type FormEvent } from 'react';
import { Info, Loader2, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ConfigureMicroSip, MicroSipExeField, TestDial } from '@/components/microsip/MicroSipTools';
import { useUpdateSettings } from '@/hooks/useStatus';
import type { Status } from '@/lib/api';

function RecordingsDirField({ status }: { status: Status }) {
  const update = useUpdateSettings();
  const [dir, setDir] = useState('');

  const save = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { 'microsip.recordings_dir': dir.trim() },
      {
        onSuccess: () => {
          toast.success(dir.trim() ? 'Pasta de gravações salva' : 'Usando a pasta configurada no MicroSIP');
          setDir('');
        },
        onError: (err) => toast.error('Não foi possível salvar', { description: err instanceof Error ? err.message : String(err) }),
      },
    );
  };

  return (
    <form className="space-y-1.5" onSubmit={save}>
      <Label htmlFor="recordings-dir">Pasta de gravações</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="recordings-dir"
          className="font-mono text-sm"
          placeholder={status.microsip.recordingsDir ?? 'C:\\Users\\voce\\Music\\MicroSIP'}
          value={dir}
          onChange={(e) => setDir(e.target.value)}
          aria-describedby="recordings-dir-hint"
        />
        <Button type="submit" variant="outline" disabled={update.isPending}>
          {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Salvar pasta
        </Button>
      </div>
      <p id="recordings-dir-hint" className="text-xs text-muted-foreground">
        Em uso: <code className="break-all">{status.microsip.recordingsDir ?? 'nenhuma — ative a gravação no MicroSIP'}</code>. Deixe em branco e salve para usar a
        pasta definida no MicroSIP.
      </p>
    </form>
  );
}

export function MicroSipCard({ status }: { status: Status }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Monitor className="h-4 w-4" aria-hidden="true" />
          MicroSIP
        </CardTitle>
        <CardDescription>Softphone para Windows: integração de eventos e envio das gravações ao Bitrix24.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!status.microsip.supported && (
          <Alert>
            <Info className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>O MicroSIP só está disponível no Windows. Neste computador, use o softphone embutido (WebRTC).</AlertDescription>
          </Alert>
        )}
        <MicroSipExeField status={status} alwaysEditable />
        <RecordingsDirField status={status} />
        <Separator />
        <ConfigureMicroSip status={status} />
        <Separator />
        <TestDial />
      </CardContent>
    </Card>
  );
}

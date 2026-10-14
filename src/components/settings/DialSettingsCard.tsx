import { useState, type FormEvent, type ReactNode } from 'react';
import { Loader2, PhoneForwarded } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUpdateSettings } from '@/hooks/useStatus';
import type { DialMode, SettingsPatch, Status } from '@/lib/api';
import { DIAL_MODE_LABEL } from '@/lib/format';

const flag = (value: boolean) => (value ? '1' : '0');

function SwitchRow({ id, label, description, checked, onChange }: { id: string; label: string; description: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={`${id}-hint`} />
    </div>
  );
}

export function DialSettingsCard({ status }: { status: Status }) {
  const update = useUpdateSettings();
  const [mode, setMode] = useState<DialMode>(status.dial.mode);
  const [stripDdi, setStripDdi] = useState(status.dial.stripDdi);
  const [prefix, setPrefix] = useState(status.dial.prefix);
  const [crmCreate, setCrmCreate] = useState(status.dial.crmCreate);
  const [lineNumber, setLineNumber] = useState(status.bitrix.lineNumber ?? '');
  const [eventsEnabled, setEventsEnabled] = useState(status.events.enabled);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const patch: SettingsPatch = {
      'dial.mode': mode,
      'dial.strip_ddi': flag(stripDdi),
      'dial.prefix': prefix.trim(),
      'crm.create': flag(crmCreate),
      'bitrix.line_number': lineNumber.trim(),
      'events.enabled': flag(eventsEnabled),
    };
    update.mutate(patch, {
      onSuccess: () => {
        const lineChanged = lineNumber.trim() !== (status.bitrix.lineNumber ?? '');
        toast.success('Configurações de discagem salvas', {
          description: lineChanged ? 'Clique em "Ressincronizar linha e eventos" para criar a nova linha no Bitrix24.' : undefined,
        });
      },
      onError: (err) => toast.error('Não foi possível salvar', { description: err instanceof Error ? err.message : String(err) }),
    });
  };

  return (
    <Card>
      <form onSubmit={save}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PhoneForwarded className="h-4 w-4" aria-hidden="true" />
            Discagem
          </CardTitle>
          <CardDescription>Como os números do Bitrix24 chegam ao softphone e como as chamadas voltam para o CRM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dial-mode">Softphone</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as DialMode)}>
                <SelectTrigger id="dial-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="microsip" disabled={!status.microsip.supported}>
                    {DIAL_MODE_LABEL.microsip}
                    {!status.microsip.supported && ' (somente Windows)'}
                  </SelectItem>
                  <SelectItem value="webrtc">{DIAL_MODE_LABEL.webrtc} (WebRTC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dial-prefix">Prefixo de discagem</Label>
              <Input
                id="dial-prefix"
                inputMode="numeric"
                placeholder="Nenhum"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                aria-describedby="dial-prefix-hint"
              />
              <p id="dial-prefix-hint" className="text-xs text-muted-foreground">
                Ex.: 0 para pegar linha externa no PABX.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="line-number">Número da linha externa no Bitrix24</Label>
              <Input id="line-number" placeholder="MicroSIP" value={lineNumber} onChange={(e) => setLineNumber(e.target.value)} aria-describedby="line-number-hint" />
              <p id="line-number-hint" className="text-xs text-muted-foreground">
                Aparece no Bitrix24 como “VoipSip {lineNumber.trim() || 'MicroSIP'}”.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <SwitchRow
              id="strip-ddi"
              label="Remover DDI 55"
              description="O Bitrix24 salva números como +55…; o prefixo do país é removido antes de discar."
              checked={stripDdi}
              onChange={setStripDdi}
            />
            <SwitchRow
              id="crm-create"
              label="Criar lead para números desconhecidos"
              description="Chamadas de números que não existem no CRM geram um lead automaticamente."
              checked={crmCreate}
              onChange={setCrmCreate}
            />
            <SwitchRow
              id="events-enabled"
              label="Receber cliques do Bitrix24"
              description="Ao clicar em um telefone no Bitrix24, a chamada é iniciada neste computador."
              checked={eventsEnabled}
              onChange={setEventsEnabled}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Salvar discagem
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

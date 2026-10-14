import { Globe, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StatusDot } from '@/components/common/Status';
import { ConfigureMicroSip, MicroSipExeField, TestDial } from '@/components/microsip/MicroSipTools';
import { SipAccountForm } from '@/components/sip/SipAccountForm';
import { useUpdateSettings } from '@/hooks/useStatus';
import { useSipAccountMutations } from '@/hooks/useSipAccounts';
import { usePhone } from '@/hooks/usePhone';
import type { DialMode, Status } from '@/lib/api';
import { REGISTRATION } from '@/lib/format';
import { cn } from '@/lib/utils';

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

function ModeOption({ value, title, description, icon: Icon, disabled, note }: {
  value: DialMode;
  title: string;
  description: string;
  icon: typeof Monitor;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <Label
      htmlFor={`mode-${value}`}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal transition-colors hover:bg-accent/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5',
        disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent',
      )}
    >
      <RadioGroupItem id={`mode-${value}`} value={value} disabled={disabled} className="mt-1" />
      <span className="space-y-1">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {title}
        </span>
        <span className="block text-sm text-muted-foreground">{description}</span>
        {note && <span className="block text-xs font-medium text-warning-foreground dark:text-warning">{note}</span>}
      </span>
    </Label>
  );
}

function WebRtcSetup() {
  const { account, state } = usePhone();
  const { create } = useSipAccountMutations();

  if (account) {
    const reg = REGISTRATION[state.registration];
    return (
      <div className="space-y-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">{account.display_name}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {account.sip_username}@{account.sip_domain || account.sip_server}
        </p>
        <p className="flex items-center gap-2">
          <StatusDot tone={reg.tone} pulse={state.registration === 'connecting'} />
          {reg.label}
        </p>
        {state.registrationError && <p className="text-xs text-destructive">{state.registrationError}</p>}
        <p className="text-xs text-muted-foreground">Edite ou adicione contas em Configurações → Contas SIP.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Informe a conta SIP do seu PABX. Ele precisa aceitar SIP sobre WebSocket seguro (WSS) — por exemplo Asterisk/FreePBX com WebRTC habilitado.
      </p>
      <SipAccountForm
        submitLabel="Salvar conta SIP"
        pending={create.isPending}
        onSubmit={(fields) =>
          create.mutate(
            { ...fields, is_default: true },
            {
              onSuccess: () => toast.success('Conta SIP salva. Registrando o softphone…'),
              onError: (err) => toast.error('Não foi possível salvar a conta', { description: errorMessage(err) }),
            },
          )
        }
      />
    </div>
  );
}

function MicroSipSetup({ status }: { status: Status }) {
  return (
    <div className="space-y-5">
      <MicroSipExeField status={status} />
      <Separator />
      <ConfigureMicroSip status={status} />
      <Separator />
      <TestDial />
    </div>
  );
}

export function StepSoftphone({ status }: { status: Status }) {
  const update = useUpdateSettings();
  const mode = status.dial.mode;

  const changeMode = (value: string) =>
    update.mutate(
      { 'dial.mode': value as DialMode },
      { onError: (err) => toast.error('Não foi possível alterar o modo', { description: errorMessage(err) }) },
    );

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium">Como você vai fazer e receber as chamadas?</legend>
        <RadioGroup value={mode} onValueChange={changeMode} className="grid gap-3 sm:grid-cols-2" disabled={update.isPending}>
          <ModeOption
            value="microsip"
            title="MicroSIP"
            icon={Monitor}
            description="Softphone instalado no Windows. O conector abre as chamadas nele e lê as gravações."
            disabled={!status.microsip.supported}
            note={status.microsip.supported ? undefined : 'Disponível apenas no Windows'}
          />
          <ModeOption
            value="webrtc"
            title="Softphone embutido (WebRTC)"
            icon={Globe}
            description="Telefone dentro deste aplicativo. Requer PABX com suporte a WebSocket (WSS)."
          />
        </RadioGroup>
      </fieldset>

      <Separator />

      {mode === 'microsip' ? <MicroSipSetup status={status} /> : <WebRtcSetup />}
    </div>
  );
}

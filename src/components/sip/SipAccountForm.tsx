import { useId, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SipAccount, SipAccountInput } from '@/lib/api';
import { wsUrl } from '@/lib/webrtc-phone';

export type SipAccountFields = Omit<SipAccountInput, 'is_default'>;

const EMPTY: SipAccountFields = {
  display_name: '',
  sip_server: '',
  sip_domain: '',
  ws_port: 8089,
  ws_path: '/ws',
  sip_username: '',
  sip_password: '',
};

interface SipAccountFormProps {
  initial?: SipAccount | null;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (fields: SipAccountFields) => void;
  onCancel?: () => void;
}

/** SIP-over-WebSocket account used by the built-in softphone. */
export function SipAccountForm({ initial, submitLabel, pending, onSubmit, onCancel }: SipAccountFormProps) {
  const id = useId();
  const [fields, setFields] = useState<SipAccountFields>(() =>
    initial
      ? {
          display_name: initial.display_name,
          sip_server: initial.sip_server,
          sip_domain: initial.sip_domain ?? '',
          ws_port: initial.ws_port,
          ws_path: initial.ws_path,
          sip_username: initial.sip_username,
          sip_password: initial.sip_password,
        }
      : EMPTY,
  );

  const set = <K extends keyof SipAccountFields>(key: K, value: SipAccountFields[K]) => setFields((f) => ({ ...f, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...fields,
      display_name: fields.display_name.trim(),
      sip_server: fields.sip_server.trim(),
      sip_domain: fields.sip_domain?.trim() || null,
      sip_username: fields.sip_username.trim(),
      ws_path: fields.ws_path.trim() || '/ws',
    });
  };

  const field = (key: keyof SipAccountFields) => `${id}-${key}`;

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={field('display_name')}>Nome de exibição</Label>
          <Input id={field('display_name')} required placeholder="Ex.: Ramal 201 — Maria" value={fields.display_name} onChange={(e) => set('display_name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={field('sip_server')}>Servidor SIP (WebSocket)</Label>
          <Input id={field('sip_server')} required placeholder="pabx.minhaempresa.com.br" autoComplete="off" value={fields.sip_server} onChange={(e) => set('sip_server', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={field('sip_domain')}>
            Domínio SIP <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input id={field('sip_domain')} placeholder="Igual ao servidor" autoComplete="off" value={fields.sip_domain ?? ''} onChange={(e) => set('sip_domain', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={field('ws_port')}>Porta WSS</Label>
          <Input
            id={field('ws_port')}
            type="number"
            required
            min={1}
            max={65535}
            value={fields.ws_port}
            onChange={(e) => set('ws_port', Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={field('ws_path')}>Caminho WebSocket</Label>
          <Input id={field('ws_path')} placeholder="/ws" value={fields.ws_path} onChange={(e) => set('ws_path', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={field('sip_username')}>Usuário / ramal</Label>
          <Input id={field('sip_username')} required autoComplete="off" value={fields.sip_username} onChange={(e) => set('sip_username', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={field('sip_password')}>Senha SIP</Label>
          <Input
            id={field('sip_password')}
            type="password"
            required
            autoComplete="new-password"
            value={fields.sip_password}
            onChange={(e) => set('sip_password', e.target.value)}
          />
        </div>
      </div>

      {fields.sip_server && (
        <p className="break-all text-xs text-muted-foreground">
          Conexão: <code className="rounded bg-muted px-1 py-0.5">{wsUrl(fields)}</code>
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

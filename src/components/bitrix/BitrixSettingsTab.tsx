import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useSipAccounts } from '@/hooks/useSipAccounts';
import { BitrixSettings } from '@/components/settings/BitrixSettings';
import { BitrixSipLines } from '@/components/bitrix/BitrixSipLines';

const sipSchema = z.object({
  display_name: z.string().min(1, 'Nome obrigatório'),
  sip_server: z.string().min(1, 'Servidor obrigatório'),
  sip_domain: z.string().optional(),
  ws_port: z.coerce.number().min(1).max(65535),
  transport: z.string().default('wss'),
  sip_username: z.string().min(1, 'Usuário obrigatório'),
  sip_password: z.string().min(1, 'Senha obrigatória'),
  is_default: z.boolean().default(false),
});

type SipForm = z.infer<typeof sipSchema>;

interface Props {
  companyId: string;
}

export function BitrixSettingsTab({ companyId }: Props) {
  const { sipAccounts, isLoading: sipLoading, addSipAccount, deleteSipAccount, updateSipAccount } = useSipAccounts(companyId);
  const [showSipForm, setShowSipForm] = useState(false);
  const { toast } = useToast();

  const form = useForm<SipForm>({
    resolver: zodResolver(sipSchema),
    defaultValues: { display_name: '', sip_server: '', sip_domain: '', ws_port: 8089, transport: 'wss', sip_username: '', sip_password: '', is_default: false },
  });

  const onAddSip = async (data: SipForm) => {
    try {
      await addSipAccount.mutateAsync(data as any);
      toast({ title: 'Conta SIP adicionada' });
      form.reset();
      setShowSipForm(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteSip = async (id: string) => {
    try {
      await deleteSipAccount.mutateAsync(id);
      toast({ title: 'Conta removida' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleSetDefault = async (id: string) => {
    for (const acc of sipAccounts) {
      if (acc.id === id) await updateSipAccount.mutateAsync({ id, is_default: true });
      else if (acc.is_default) await updateSipAccount.mutateAsync({ id: acc.id, is_default: false });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* SIP Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Contas SIP</CardTitle>
              <CardDescription>Ramais configurados para telefonia</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowSipForm(!showSipForm)}>
              <Plus className="mr-1 h-4 w-4" /> Nova Conta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showSipForm && (
            <form onSubmit={form.handleSubmit(onAddSip)} className="rounded-lg border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Nome *</Label>
                  <Input {...form.register('display_name')} placeholder="Ramal 100" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Servidor SIP *</Label>
                  <Input {...form.register('sip_server')} placeholder="sip.empresa.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Domínio SIP</Label>
                  <Input {...form.register('sip_domain')} placeholder="empresa.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Porta WS</Label>
                  <Input {...form.register('ws_port')} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Usuário *</Label>
                  <Input {...form.register('sip_username')} />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Senha *</Label>
                  <Input {...form.register('sip_password')} type="password" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={addSipAccount.isPending}>
                  {addSipAccount.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Adicionar
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowSipForm(false)}>Cancelar</Button>
              </div>
            </form>
          )}

          {sipLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : sipAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta SIP cadastrada.</p>
          ) : (
            sipAccounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{acc.display_name}</span>
                    {acc.is_default && <Badge variant="secondary" className="text-xs">Padrão</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{acc.sip_username}@{acc.sip_server}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!acc.is_default && (
                    <Button size="sm" variant="ghost" onClick={() => handleSetDefault(acc.id)} className="text-xs">Definir padrão</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteSip(acc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* SIP Lines in Bitrix24 */}
      <BitrixSipLines companyId={companyId} sipAccounts={sipAccounts} />

      <Separator />

      {/* Bitrix Integration Settings */}
      <BitrixSettings companyId={companyId} />
    </div>
  );
}

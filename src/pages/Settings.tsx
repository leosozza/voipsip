import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Server, Building2, Check } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCompany } from '@/hooks/useCompany';
import { useSipAccounts } from '@/hooks/useSipAccounts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const sipSchema = z.object({
  display_name: z.string().min(1, 'Nome obrigatório'),
  sip_server: z.string().min(1, 'Servidor obrigatório'),
  sip_domain: z.string().optional(),
  ws_port: z.coerce.number().min(1).max(65535).default(8089),
  transport: z.string().default('wss'),
  sip_username: z.string().min(1, 'Usuário obrigatório'),
  sip_password: z.string().min(1, 'Senha obrigatória'),
  is_default: z.boolean().default(false),
});

type SipForm = z.infer<typeof sipSchema>;

const companySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
});

export default function Settings() {
  const { currentCompany, createCompany } = useCompany();
  const { sipAccounts, isLoading, addSipAccount, deleteSipAccount } = useSipAccounts(currentCompany?.id);
  const [showSipForm, setShowSipForm] = useState(false);
  const { toast } = useToast();

  const sipForm = useForm<SipForm>({
    resolver: zodResolver(sipSchema),
    defaultValues: { display_name: '', sip_server: '', sip_domain: '', ws_port: 8089, transport: 'wss', sip_username: '', sip_password: '', is_default: false },
  });

  const companyForm = useForm<{ name: string }>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: '' },
  });

  const onCreateCompany = async (data: { name: string }) => {
    try {
      await createCompany.mutateAsync(data.name);
      toast({ title: 'Empresa criada!' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const onAddSipAccount = async (data: SipForm) => {
    try {
      await addSipAccount.mutateAsync(data as any);
      toast({ title: 'Conta SIP adicionada!' });
      sipForm.reset();
      setShowSipForm(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteSip = async (id: string) => {
    try {
      await deleteSipAccount.mutateAsync(id);
      toast({ title: 'Conta SIP removida' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  if (!currentCompany) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <CardTitle>Criar Empresa</CardTitle>
              <CardDescription>Configure sua empresa para começar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={companyForm.handleSubmit(onCreateCompany)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input {...companyForm.register('name')} placeholder="Minha Empresa" />
                  {companyForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{companyForm.formState.errors.name.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={createCompany.isPending}>
                  Criar Empresa
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold">Configurações</h2>
          <p className="text-muted-foreground">Gerencie sua conta SIP e empresa</p>
        </div>

        {/* Company info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="font-medium">{currentCompany.name}</span>
              <Badge variant="outline">{(currentCompany as any).role || 'admin'}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* SIP Accounts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Server className="h-5 w-5" />
                  Contas SIP
                </CardTitle>
                <CardDescription>Configure servidores SIP para fazer e receber chamadas via WebRTC</CardDescription>
              </div>
              <Button onClick={() => setShowSipForm(!showSipForm)} size="sm">
                <Plus className="mr-2 h-4 w-4" />Nova Conta
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSipForm && (
              <form onSubmit={sipForm.handleSubmit(onAddSipAccount)} className="space-y-4 rounded-lg border p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome da Conta *</Label>
                    <Input {...sipForm.register('display_name')} placeholder="Meu PBX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Servidor SIP *</Label>
                    <Input {...sipForm.register('sip_server')} placeholder="sip.exemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Domínio SIP</Label>
                    <Input {...sipForm.register('sip_domain')} placeholder="exemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Porta WebSocket</Label>
                    <Input type="number" {...sipForm.register('ws_port')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Usuário SIP *</Label>
                    <Input {...sipForm.register('sip_username')} placeholder="1001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha SIP *</Label>
                    <Input type="password" {...sipForm.register('sip_password')} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={addSipAccount.isPending}>Salvar</Button>
                  <Button type="button" variant="outline" onClick={() => { sipForm.reset(); setShowSipForm(false); }}>Cancelar</Button>
                </div>
              </form>
            )}

            {sipAccounts.length === 0 && !showSipForm ? (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="mx-auto mb-2 h-8 w-8" />
                <p>Nenhuma conta SIP configurada</p>
                <p className="text-sm">Adicione uma conta para começar a fazer chamadas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sipAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.display_name}</span>
                        {account.is_default && <Badge variant="secondary">Padrão</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {account.sip_username}@{account.sip_server}:{account.ws_port} ({account.transport})
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSip(account.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

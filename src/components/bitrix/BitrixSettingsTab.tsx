import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, Trash2, RefreshCw, Phone, Zap, Unlink, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useSipAccounts } from '@/hooks/useSipAccounts';
import { useBitrixCredentials } from '@/hooks/useBitrixCredentials';
import { BitrixSipLines } from '@/components/bitrix/BitrixSipLines';
import { BitrixUserMappings } from '@/components/bitrix/BitrixUserMappings';
import { testSipConnection, type SipTestResult } from '@/lib/sip-test';

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

const lineSchema = z.object({
  number: z.string().min(1, 'Número obrigatório'),
  name: z.string().optional(),
});

type LineForm = z.infer<typeof lineSchema>;

interface Props {
  companyId: string;
}

export function BitrixSettingsTab({ companyId }: Props) {
  const { sipAccounts, isLoading: sipLoading, addSipAccount, deleteSipAccount, updateSipAccount } = useSipAccounts(companyId);
  const { isConnected, isExpired, isRefreshing, getExternalLines, addExternalLine, deleteExternalLine, bindEvents, unbindEvents } = useBitrixCredentials(companyId);
  const [showSipForm, setShowSipForm] = useState(false);
  const [showLineForm, setShowLineForm] = useState(false);
  const [externalLines, setExternalLines] = useState<any[]>([]);
  const [linesLoaded, setLinesLoaded] = useState(false);
  const [eventsBound, setEventsBound] = useState(false);
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, SipTestResult>>({});
  const { toast } = useToast();

  const form = useForm<SipForm>({
    resolver: zodResolver(sipSchema),
    defaultValues: { display_name: '', sip_server: '', sip_domain: '', ws_port: 8089, transport: 'wss', sip_username: '', sip_password: '', is_default: false },
  });

  const lineForm = useForm<LineForm>({
    resolver: zodResolver(lineSchema),
    defaultValues: { number: '', name: '' },
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

  const handleTestSip = async (acc: import('@/types/voip').SipAccount) => {
    setTestingAccountId(acc.id);
    setTestResults(prev => ({ ...prev, [acc.id]: undefined as any }));
    try {
      const result = await testSipConnection(acc);
      setTestResults(prev => ({ ...prev, [acc.id]: result }));
      toast({
        title: result.success ? 'Conexão SIP OK' : 'Falha na conexão SIP',
        description: `${result.message} (${(result.durationMs / 1000).toFixed(1)}s)`,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (err: any) {
      toast({ title: 'Erro no teste', description: err.message, variant: 'destructive' });
    } finally {
      setTestingAccountId(null);
    }
  };

  const onLoadLines = async () => {
    try {
      const lines = await getExternalLines.mutateAsync();
      setExternalLines(lines || []);
      setLinesLoaded(true);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar linhas', description: err.message, variant: 'destructive' });
    }
  };

  const onAddLine = async (data: LineForm) => {
    try {
      await addExternalLine.mutateAsync({ number: data.number, name: data.name });
      toast({ title: 'Linha registrada no Bitrix24' });
      lineForm.reset();
      setShowLineForm(false);
      onLoadLines();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const onDeleteLine = async (number: string) => {
    try {
      await deleteExternalLine.mutateAsync(number);
      toast({ title: 'Linha removida' });
      onLoadLines();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const onBindEvents = async () => {
    try {
      await bindEvents.mutateAsync();
      setEventsBound(true);
      toast({ title: 'Eventos registrados com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const onUnbindEvents = async () => {
    try {
      await unbindEvents.mutateAsync();
      setEventsBound(false);
      toast({ title: 'Eventos removidos' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
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
              <div key={acc.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{acc.display_name}</span>
                      {acc.is_default && <Badge variant="secondary" className="text-xs">Padrão</Badge>}
                      {testResults[acc.id] && (
                        <Badge variant={testResults[acc.id].success ? 'default' : 'destructive'} className="text-xs">
                          {testResults[acc.id].success ? '✓ OK' : '✗ Falha'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{acc.sip_username}@{acc.sip_server}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTestSip(acc)}
                      disabled={testingAccountId === acc.id}
                      title="Testar conexão SIP"
                    >
                      {testingAccountId === acc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                    </Button>
                    {!acc.is_default && (
                      <Button size="sm" variant="ghost" onClick={() => handleSetDefault(acc.id)} className="text-xs">Definir padrão</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteSip(acc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {testResults[acc.id] && !testResults[acc.id].success && (
                  <p className="text-xs text-destructive">{testResults[acc.id].message}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* SIP Lines in Bitrix24 */}
      <BitrixSipLines companyId={companyId} sipAccounts={sipAccounts} />

      <Separator />

      {/* User Mappings */}
      <BitrixUserMappings companyId={companyId} />

      <Separator />

      {/* External Lines (Sales Intelligence) */}
      {isConnected && !isExpired && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5" />
              Linhas Externas (Sales Intelligence)
            </CardTitle>
            <CardDescription>
              Registre linhas telefônicas no Bitrix24 para rastreamento de chamadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onLoadLines} disabled={getExternalLines.isPending}>
                {getExternalLines.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Carregar Linhas
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowLineForm(!showLineForm)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Linha
              </Button>
            </div>

            {showLineForm && (
              <form onSubmit={lineForm.handleSubmit(onAddLine)} className="rounded-lg border p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Número *</Label>
                    <Input {...lineForm.register('number')} placeholder="+5511999999999" />
                    {lineForm.formState.errors.number && (
                      <p className="text-xs text-destructive">{lineForm.formState.errors.number.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Nome</Label>
                    <Input {...lineForm.register('name')} placeholder="Linha principal" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addExternalLine.isPending}>
                    {addExternalLine.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar no Bitrix24
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowLineForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {linesLoaded && (
              <div className="space-y-2">
                {externalLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma linha externa registrada.</p>
                ) : (
                  externalLines.map((line: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-2">
                      <div>
                        <p className="text-sm font-medium">{line.NUMBER}</p>
                        {line.NAME && <p className="text-xs text-muted-foreground">{line.NAME}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteLine(line.NUMBER)}
                        disabled={deleteExternalLine.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Events Card */}
      {isConnected && !isExpired && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              Eventos Bitrix24
            </CardTitle>
            <CardDescription>
              Click-to-Call e Callback do CRM
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Registre os handlers para receber eventos do Bitrix24 quando um usuário clicar para ligar no CRM
              ou quando um callback for solicitado.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onBindEvents} disabled={bindEvents.isPending}>
                {bindEvents.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Registrar Eventos
              </Button>
              <Button size="sm" variant="ghost" onClick={onUnbindEvents} disabled={unbindEvents.isPending}>
                <Unlink className="mr-2 h-4 w-4" />
                Remover Eventos
              </Button>
            </div>
            {eventsBound && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ Eventos OnExternalCallStart e OnExternalCallBackStart registrados com sucesso.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link2, Unlink, RefreshCw, Check, AlertTriangle, Loader2, ExternalLink, Phone, Zap, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useBitrixCredentials } from '@/hooks/useBitrixCredentials';

const domainSchema = z.object({
  bitrix_domain: z.string().min(1, 'Domínio obrigatório').regex(/^[a-zA-Z0-9-]+\.bitrix24\.(com\.br|com|ru|eu|de)$/, 'Ex: empresa.bitrix24.com.br'),
});

type DomainForm = z.infer<typeof domainSchema>;

const lineSchema = z.object({
  number: z.string().min(1, 'Número obrigatório'),
  name: z.string().optional(),
});

type LineForm = z.infer<typeof lineSchema>;

interface BitrixSettingsProps {
  companyId: string;
}

export function BitrixSettings({ companyId }: BitrixSettingsProps) {
  const {
    credentials, isLoading, isConnected, isExpired, isRefreshing,
    saveBitrixCredentials, deleteBitrixCredentials, testConnection,
    getExternalLines, addExternalLine, deleteExternalLine,
    bindEvents, unbindEvents, linkInstallation,
  } = useBitrixCredentials(companyId);
  const [showDomainForm, setShowDomainForm] = useState(false);
  const [showLineForm, setShowLineForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkDomain, setLinkDomain] = useState('');
  const [externalLines, setExternalLines] = useState<any[]>([]);
  const [linesLoaded, setLinesLoaded] = useState(false);
  const [eventsBound, setEventsBound] = useState(false);
  const { toast } = useToast();

  const form = useForm<DomainForm>({
    resolver: zodResolver(domainSchema),
    defaultValues: { bitrix_domain: credentials?.bitrix_domain || '' },
  });

  const lineForm = useForm<LineForm>({
    resolver: zodResolver(lineSchema),
    defaultValues: { number: '', name: '' },
  });

  if (credentials && !form.formState.isDirty) {
    form.setValue('bitrix_domain', credentials.bitrix_domain);
  }

  const startOAuth = async (data: DomainForm) => {
    const domain = data.bitrix_domain;
    try {
      const { data: result, error } = await supabase.functions.invoke('bitrix-client-id');
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      const clientId = result.client_id;
      localStorage.setItem('bitrix_oauth_domain', domain);
      localStorage.setItem('bitrix_oauth_company_id', companyId);
      const redirectUri = `${window.location.origin}/bitrix/callback`;
      const authUrl = `https://${domain}/oauth/authorize/?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
      window.location.href = authUrl;
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Não foi possível obter o Client ID.', variant: 'destructive' });
    }
  };

  const onTest = async () => {
    try {
      await testConnection.mutateAsync();
      toast({ title: 'Conexão OK!', description: 'Bitrix24 respondeu com sucesso.' });
    } catch (error: any) {
      toast({ title: 'Erro na conexão', description: error.message, variant: 'destructive' });
    }
  };

  const onDisconnect = async () => {
    try {
      await deleteBitrixCredentials.mutateAsync();
      toast({ title: 'Bitrix24 desconectado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const onLoadLines = async () => {
    try {
      const result = await getExternalLines.mutateAsync();
      setExternalLines(result || []);
      setLinesLoaded(true);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar linhas', description: error.message, variant: 'destructive' });
    }
  };

  const onAddLine = async (data: LineForm) => {
    try {
      await addExternalLine.mutateAsync({ number: data.number, name: data.name });
      toast({ title: 'Linha registrada', description: `${data.number} adicionada no Bitrix24.` });
      lineForm.reset();
      setShowLineForm(false);
      onLoadLines();
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar linha', description: error.message, variant: 'destructive' });
    }
  };

  const onDeleteLine = async (number: string) => {
    try {
      await deleteExternalLine.mutateAsync(number);
      toast({ title: 'Linha removida' });
      onLoadLines();
    } catch (error: any) {
      toast({ title: 'Erro ao remover linha', description: error.message, variant: 'destructive' });
    }
  };

  const onBindEvents = async () => {
    try {
      const result = await bindEvents.mutateAsync();
      setEventsBound(true);
      toast({ title: 'Eventos registrados', description: 'Click-to-Call e Callback estão ativos.' });
    } catch (error: any) {
      toast({ title: 'Erro ao registrar eventos', description: error.message, variant: 'destructive' });
    }
  };

  const onUnbindEvents = async () => {
    try {
      await unbindEvents.mutateAsync();
      setEventsBound(false);
      toast({ title: 'Eventos removidos' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover eventos', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="h-5 w-5" />
                Integração Bitrix24
              </CardTitle>
              <CardDescription>
                Sincronize chamadas e gravações automaticamente com o Bitrix24
              </CardDescription>
            </div>
            {isConnected && (
              <Badge variant={isRefreshing ? 'secondary' : isExpired ? 'destructive' : 'default'} className="flex items-center gap-1">
                {isRefreshing ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Renovando...</>
                ) : isExpired ? (
                  <><AlertTriangle className="h-3 w-3" /> Token expirado</>
                ) : (
                  <><Check className="h-3 w-3" /> Conectado</>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected && !showDomainForm ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Domínio</p>
                <p className="font-medium">{credentials?.bitrix_domain}</p>
                {credentials?.expires_at && (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">Token expira em</p>
                    <p className="text-sm">{new Date(credentials.expires_at).toLocaleString('pt-BR')}</p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={onTest} disabled={testConnection.isPending}>
                  {testConnection.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Testar Conexão
                </Button>
                {isExpired && (
                  <Button size="sm" variant="outline" onClick={() => setShowDomainForm(true)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reconectar
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={onDisconnect} disabled={deleteBitrixCredentials.isPending}>
                  <Unlink className="mr-2 h-4 w-4" />
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(startOAuth)} className="space-y-4">
              <div className="space-y-2">
                <Label>Domínio Bitrix24 *</Label>
                <Input {...form.register('bitrix_domain')} placeholder="empresa.bitrix24.com.br" />
                {form.formState.errors.bitrix_domain && (
                  <p className="text-sm text-destructive">{form.formState.errors.bitrix_domain.message}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Ao clicar em "Conectar", você será redirecionado ao Bitrix24 para autorizar o acesso.
              </p>
              <div className="flex gap-2">
                <Button type="submit">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Conectar via OAuth
                </Button>
                {isConnected && (
                  <Button type="button" variant="outline" onClick={() => setShowDomainForm(false)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Link Installation Card - show when not connected */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5" />
              Vincular Portal Bitrix24
            </CardTitle>
            <CardDescription>
              Se o aplicativo já foi instalado via Marketplace, vincule o portal à sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showLinkForm ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Domínio do portal Bitrix24</Label>
                  <Input
                    value={linkDomain}
                    onChange={(e) => setLinkDomain(e.target.value)}
                    placeholder="empresa.bitrix24.com.br"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await linkInstallation.mutateAsync(linkDomain);
                        toast({ title: 'Portal vinculado!', description: 'Tokens sincronizados com sucesso.' });
                        setShowLinkForm(false);
                        setLinkDomain('');
                      } catch (err: any) {
                        toast({ title: 'Erro', description: err.message, variant: 'destructive' });
                      }
                    }}
                    disabled={linkInstallation.isPending || !linkDomain}
                  >
                    {linkInstallation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Vincular
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowLinkForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowLinkForm(true)}>
                <Link2 className="mr-2 h-4 w-4" />
                Vincular instalação existente
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      {(isConnected && !isExpired) || isRefreshing ? (
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

      {/* Events Card - only show when connected */}
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
              <Button
                size="sm"
                variant="outline"
                onClick={onBindEvents}
                disabled={bindEvents.isPending}
              >
                {bindEvents.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Registrar Eventos
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onUnbindEvents}
                disabled={unbindEvents.isPending}
              >
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

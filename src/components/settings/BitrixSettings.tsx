import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link2, Unlink, RefreshCw, Check, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useBitrixCredentials } from '@/hooks/useBitrixCredentials';

const domainSchema = z.object({
  bitrix_domain: z.string().min(1, 'Domínio obrigatório').regex(/^[a-zA-Z0-9-]+\.bitrix24\.(com\.br|com|ru|eu|de)$/, 'Ex: empresa.bitrix24.com.br'),
});

type DomainForm = z.infer<typeof domainSchema>;

interface BitrixSettingsProps {
  companyId: string;
}

export function BitrixSettings({ companyId }: BitrixSettingsProps) {
  const { credentials, isLoading, isConnected, isExpired, saveBitrixCredentials, deleteBitrixCredentials, testConnection } = useBitrixCredentials(companyId);
  const [showDomainForm, setShowDomainForm] = useState(false);
  const { toast } = useToast();

  const form = useForm<DomainForm>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      bitrix_domain: credentials?.bitrix_domain || '',
    },
  });

  if (credentials && !form.formState.isDirty) {
    form.setValue('bitrix_domain', credentials.bitrix_domain);
  }

  const startOAuth = (data: DomainForm) => {
    const domain = data.bitrix_domain;
    const clientId = import.meta.env.VITE_BITRIX_CLIENT_ID;

    if (!clientId) {
      toast({ title: 'Erro', description: 'BITRIX_CLIENT_ID não configurado. Entre em contato com o administrador.', variant: 'destructive' });
      return;
    }

    // Save context for callback
    localStorage.setItem('bitrix_oauth_domain', domain);
    localStorage.setItem('bitrix_oauth_company_id', companyId);

    const redirectUri = `${window.location.origin}/bitrix/callback`;
    const authUrl = `https://${domain}/oauth/authorize/?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;

    window.location.href = authUrl;
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
            <Badge variant={isExpired ? 'destructive' : 'default'} className="flex items-center gap-1">
              {isExpired ? (
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
              Ao clicar em "Conectar", você será redirecionado ao Bitrix24 para autorizar o acesso. Os tokens serão capturados automaticamente.
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
  );
}

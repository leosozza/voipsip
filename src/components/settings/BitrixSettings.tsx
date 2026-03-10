import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link2, Unlink, RefreshCw, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useBitrixCredentials } from '@/hooks/useBitrixCredentials';

const bitrixSchema = z.object({
  bitrix_domain: z.string().min(1, 'Domínio obrigatório').regex(/^[a-zA-Z0-9-]+\.bitrix24\.(com\.br|com|ru|eu|de)$/, 'Ex: empresa.bitrix24.com.br'),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
});

type BitrixForm = z.infer<typeof bitrixSchema>;

interface BitrixSettingsProps {
  companyId: string;
}

export function BitrixSettings({ companyId }: BitrixSettingsProps) {
  const { credentials, isLoading, isConnected, isExpired, saveBitrixCredentials, deleteBitrixCredentials, testConnection } = useBitrixCredentials(companyId);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const form = useForm<BitrixForm>({
    resolver: zodResolver(bitrixSchema),
    defaultValues: {
      bitrix_domain: credentials?.bitrix_domain || '',
      access_token: '',
      refresh_token: '',
    },
  });

  // Update form when credentials load
  if (credentials && !form.formState.isDirty) {
    form.setValue('bitrix_domain', credentials.bitrix_domain);
  }

  const onSave = async (data: BitrixForm) => {
    try {
      await saveBitrixCredentials.mutateAsync({
        bitrix_domain: data.bitrix_domain,
        access_token: data.access_token || undefined,
        refresh_token: data.refresh_token || undefined,
      });
      toast({ title: 'Credenciais Bitrix24 salvas!' });
      setShowForm(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
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
        {credentials && !showForm ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Domínio</p>
              <p className="font-medium">{credentials.bitrix_domain}</p>
              {credentials.expires_at && (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">Token expira em</p>
                  <p className="text-sm">{new Date(credentials.expires_at).toLocaleString('pt-BR')}</p>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onTest} disabled={testConnection.isPending}>
                {testConnection.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Testar Conexão
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={onDisconnect} disabled={deleteBitrixCredentials.isPending}>
                <Unlink className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            <div className="space-y-2">
              <Label>Domínio Bitrix24 *</Label>
              <Input {...form.register('bitrix_domain')} placeholder="empresa.bitrix24.com.br" />
              {form.formState.errors.bitrix_domain && (
                <p className="text-sm text-destructive">{form.formState.errors.bitrix_domain.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input {...form.register('access_token')} placeholder="Cole o access_token do OAuth" />
              <p className="text-xs text-muted-foreground">
                Obtido via fluxo OAuth do Bitrix24. Será renovado automaticamente.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Refresh Token</Label>
              <Input {...form.register('refresh_token')} placeholder="Cole o refresh_token do OAuth" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saveBitrixCredentials.isPending}>
                {saveBitrixCredentials.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
              {credentials && (
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
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

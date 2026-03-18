import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, CheckCircle, Settings, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveBitrixContext } from '@/lib/bitrix-context';

interface InstallationStatus {
  domain: string;
  memberId: string;
  isInstalled: boolean;
  companyLinked: boolean;
}

export default function BitrixApp() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<InstallationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasContext, setHasContext] = useState(true);

  useEffect(() => {
    async function init() {
      const ctx = await resolveBitrixContext(searchParams);

      // No Bitrix context at all
      if (!ctx.memberId && !ctx.domain) {
        setHasContext(false);
        setLoading(false);
        return;
      }

      try {
        // Try by member_id first, fallback to domain
        let data: any = null;
        if (ctx.memberId) {
          const res = await supabase
            .from('bitrix_installations')
            .select('id, domain, company_id, member_id')
            .eq('member_id', ctx.memberId)
            .maybeSingle();
          data = res.data;
        }
        if (!data && ctx.domain) {
          const res = await supabase
            .from('bitrix_installations')
            .select('id, domain, company_id, member_id')
            .eq('domain', ctx.domain)
            .maybeSingle();
          data = res.data;
        }

        // Auto-correct: update domain if installation exists without one
        if (data && !data.domain && ctx.domain) {
          await supabase
            .from('bitrix_installations')
            .update({ domain: ctx.domain })
            .eq('id', data.id);
          data.domain = ctx.domain;
        }

        const resolvedDomain = ctx.domain || data?.domain || '';

        setStatus({
          domain: resolvedDomain,
          memberId: ctx.memberId || data?.member_id || '',
          isInstalled: !!data,
          companyLinked: !!data?.company_id,
        });
      } catch {
        setStatus({
          domain: ctx.domain,
          memberId: ctx.memberId,
          isInstalled: false,
          companyLinked: false,
        });
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando integração...</p>
        </div>
      </div>
    );
  }

  if (!hasContext) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              Este aplicativo deve ser acessado através do Bitrix24.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              MicroSip Connector - Integração Telefonia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.isInstalled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Aplicativo instalado</span>
                </div>
                {status.domain && (
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-sm text-muted-foreground">Portal</p>
                    <p className="font-medium">{status.domain}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Empresa vinculada:</span>
                  <Badge variant={status.companyLinked ? 'default' : 'secondary'}>
                    {status.companyLinked ? 'Sim' : 'Não vinculada'}
                  </Badge>
                </div>
                {!status.companyLinked && (
                  <p className="text-sm text-muted-foreground">
                    Para vincular este portal a uma empresa, acesse as Configurações do aplicativo
                    e faça login na plataforma MicroSip Connector.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  Instalação em processamento. Aguarde alguns instantes e recarregue a página.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {status?.isInstalled && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Funcionalidades</p>
                  <p className="text-sm text-muted-foreground">
                    Click-to-Call, registro de chamadas, gravações e Sales Intelligence
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = status?.domain || '';
                    const m = status?.memberId || '';
                    window.location.href = `/bitrix/settings?DOMAIN=${encodeURIComponent(d)}&member_id=${encodeURIComponent(m)}`;
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, CheckCircle, Settings, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

  const domain = searchParams.get('DOMAIN') || '';
  const memberId = searchParams.get('member_id') || '';

  useEffect(() => {
    async function checkInstallation() {
      if (!memberId) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('bitrix_installations')
          .select('id, domain, company_id')
          .eq('member_id', memberId)
          .maybeSingle();

        setStatus({
          domain: domain || data?.domain || '',
          memberId,
          isInstalled: !!data,
          companyLinked: !!data?.company_id,
        });
      } catch {
        setStatus({
          domain,
          memberId,
          isInstalled: false,
          companyLinked: false,
        });
      } finally {
        setLoading(false);
      }
    }

    checkInstallation();
  }, [domain, memberId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-sm text-muted-foreground">Portal</p>
                  <p className="font-medium">{status.domain}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Empresa vinculada:</span>
                  <Badge variant={status.companyLinked ? 'default' : 'secondary'}>
                    {status.companyLinked ? 'Sim' : 'Não vinculada'}
                  </Badge>
                </div>
                {!status.companyLinked && (
                  <p className="text-sm text-muted-foreground">
                    Para vincular este portal a uma empresa, acesse as Configurações do aplicativo
                    e faça login na plataforma VoIP SIP.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  {memberId
                    ? 'Instalação não encontrada. Reinstale o aplicativo.'
                    : 'Este aplicativo deve ser acessado através do Bitrix24.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
                  const settingsUrl = `/bitrix/settings?DOMAIN=${encodeURIComponent(domain)}&member_id=${encodeURIComponent(memberId)}`;
                  window.location.href = settingsUrl;
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

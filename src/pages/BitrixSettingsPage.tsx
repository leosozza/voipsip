import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BitrixSettings } from '@/components/settings/BitrixSettings';

export default function BitrixSettingsPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const domain = searchParams.get('DOMAIN') || '';
  const memberId = searchParams.get('member_id') || '';

  useEffect(() => {
    async function loadInstallation() {
      if (!memberId) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('bitrix_installations')
          .select('company_id')
          .eq('member_id', memberId)
          .maybeSingle();

        setCompanyId(data?.company_id || null);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    loadInstallation();
  }, [memberId]);

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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.location.href = `/bitrix/app?DOMAIN=${encodeURIComponent(domain)}&member_id=${encodeURIComponent(memberId)}`;
            }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-lg font-semibold">Configurações - {domain}</h1>
        </div>

        {companyId ? (
          <BitrixSettings companyId={companyId} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Empresa não vinculada</CardTitle>
              <CardDescription>
                Este portal Bitrix24 ainda não está vinculado a uma empresa na plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Para configurar a integração, primeiro faça login na plataforma VoIP SIP
                e vincule o portal <strong>{domain}</strong> à sua empresa nas configurações.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

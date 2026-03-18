import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BitrixSettings } from '@/components/settings/BitrixSettings';

declare global {
  interface Window {
    BX24?: {
      init: (callback: () => void) => void;
      fitWindow: () => void;
      getAuth: () => { domain: string; member_id: string; access_token: string } | null;
    };
  }
}

function loadBX24Script(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.BX24) { resolve(); return; }
    const script = document.createElement('script');
    script.src = '//api.bitrix24.com/api/v1/';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load BX24 SDK'));
    document.head.appendChild(script);
  });
}

export default function BitrixSettingsPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [domain, setDomain] = useState(searchParams.get('DOMAIN') || '');
  const [memberId, setMemberId] = useState(searchParams.get('member_id') || '');

  useEffect(() => {
    async function init() {
      let d = domain;
      let m = memberId;

      try {
        await loadBX24Script();
        await new Promise<void>((resolve) => {
          window.BX24?.init(() => {
            window.BX24?.fitWindow();
            const auth = window.BX24?.getAuth();
            if (auth) {
              if (!d) { d = auth.domain; setDomain(d); }
              if (!m) { m = auth.member_id; setMemberId(m); }
            }
            resolve();
          });
        });
      } catch {
        // SDK not available
      }

      if (!m) { setLoading(false); return; }

      try {
        const { data } = await supabase
          .from('bitrix_installations')
          .select('company_id')
          .eq('member_id', m)
          .maybeSingle();
        setCompanyId(data?.company_id || null);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

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
                Para configurar a integração, primeiro faça login na plataforma MicroSip Connector
                e vincule o portal <strong>{domain}</strong> à sua empresa nas configurações.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BitrixCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const domain = searchParams.get('domain') || localStorage.getItem('bitrix_oauth_domain');
    const companyId = localStorage.getItem('bitrix_oauth_company_id');

    if (!code) {
      setStatus('error');
      setErrorMsg('Código de autorização não encontrado na URL.');
      return;
    }

    if (!domain || !companyId) {
      setStatus('error');
      setErrorMsg('Domínio ou empresa não encontrados. Tente iniciar o fluxo novamente nas Configurações.');
      return;
    }

    async function exchangeCode() {
      try {
        const { data, error } = await supabase.functions.invoke('bitrix-oauth-callback', {
          body: { code, domain, company_id: companyId },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        localStorage.removeItem('bitrix_oauth_domain');
        localStorage.removeItem('bitrix_oauth_company_id');
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Erro ao trocar código por tokens.');
      }
    }

    exchangeCode();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Conexão Bitrix24</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Conectando ao Bitrix24...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-10 w-10 text-green-500" />
              <p className="text-center font-medium">Bitrix24 conectado com sucesso!</p>
              <Button onClick={() => navigate('/settings')}>Voltar às Configurações</Button>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-center text-sm text-destructive">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate('/settings')}>Voltar às Configurações</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

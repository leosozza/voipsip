import { useState } from 'react';
import { Download, Monitor, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSipAccounts } from '@/hooks/useSipAccounts';

type ProtocolStatus = 'un-tested' | 'testing' | 'supported' | 'unsupported';

interface Props {
  companyId: string;
}

export function BitrixGuideTab({ companyId }: Props) {
  const { defaultAccount, sipAccounts } = useSipAccounts(companyId);
  const [protocolStatus, setProtocolStatus] = useState<ProtocolStatus>('un-tested');

  const testSipProtocol = () => {
    setProtocolStatus('testing');
    const timeout = setTimeout(() => setProtocolStatus('unsupported'), 3000);
    const onBlur = () => {
      clearTimeout(timeout);
      setProtocolStatus('supported');
      window.removeEventListener('blur', onBlur);
    };
    window.addEventListener('blur', onBlur);
    window.location.href = 'sip:test@test.invalid';
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Guia de Configuração MicroSIP</CardTitle>
          <CardDescription>Configure o MicroSIP para receber chamadas Click-to-Call do Bitrix24</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline">{sipAccounts.length} conta(s) SIP</Badge>
            <Button size="sm" variant="outline" onClick={testSipProtocol} disabled={protocolStatus === 'testing'}>
              <Phone className="mr-1 h-4 w-4" />
              {protocolStatus === 'testing' ? 'Testando...' : 'Testar Protocolo SIP'}
            </Button>
            {protocolStatus === 'supported' && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Suportado</Badge>}
            {protocolStatus === 'unsupported' && <Badge variant="destructive">Não detectado</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
            <div>
              <p className="font-medium">Baixe o MicroSIP</p>
              <p className="text-sm text-muted-foreground">
                Acesse{' '}
                <a href="https://www.microsip.org/downloads" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  microsip.org/downloads
                </a>{' '}
                e instale a versão mais recente.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
            <div>
              <p className="font-medium">Configure a conta SIP</p>
              {defaultAccount ? (
                <div className="mt-2 rounded-lg border p-3 text-sm space-y-1">
                  <p><strong>Servidor:</strong> {defaultAccount.sip_server}</p>
                  <p><strong>Usuário:</strong> {defaultAccount.sip_username}</p>
                  <p><strong>Domínio:</strong> {defaultAccount.sip_domain || defaultAccount.sip_server}</p>
                  <p><strong>Transporte:</strong> {defaultAccount.transport?.toUpperCase()}</p>
                </div>
              ) : (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhuma conta SIP cadastrada. Vá para a aba Configurações para adicionar.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
            <div>
              <p className="font-medium">Associe o MicroSIP ao protocolo SIP</p>
              <p className="text-sm text-muted-foreground">
                No Windows: Configurações → Aplicativos padrão → Protocolos → associe <code className="text-xs bg-muted px-1 py-0.5 rounded">sip:</code> ao MicroSIP.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">4</div>
            <div>
              <p className="font-medium">Teste</p>
              <p className="text-sm text-muted-foreground">
                Clique em um número no Bitrix24 CRM. O MicroSIP deve abrir e iniciar a chamada automaticamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

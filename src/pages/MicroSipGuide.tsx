import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Download, Settings, Phone, CheckCircle2, XCircle, AlertTriangle,
  ExternalLink, ArrowRight, Monitor, Shield, Volume2, ChevronRight,
} from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { useSipAccounts } from '@/hooks/useSipAccounts';
import { useState } from 'react';
import microsipImg from '@/assets/microsip-config-example.png';

type ProtocolStatus = 'untested' | 'testing' | 'supported' | 'unsupported';

export default function MicroSipGuide() {
  const { currentCompany } = useCompany();
  const { sipAccounts } = useSipAccounts(currentCompany?.id);
  const [protocolStatus, setProtocolStatus] = useState<ProtocolStatus>('untested');

  const testSipProtocol = () => {
    setProtocolStatus('testing');
    // Create a hidden iframe to test if sip: protocol is registered
    const testFrame = document.createElement('iframe');
    testFrame.style.display = 'none';
    document.body.appendChild(testFrame);

    let responded = false;

    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        // If blur happened, the protocol handler opened something
        setProtocolStatus('unsupported');
        cleanup();
      }
    }, 3000);

    const onBlur = () => {
      if (!responded) {
        responded = true;
        setProtocolStatus('supported');
        clearTimeout(timeout);
        cleanup();
      }
    };

    const cleanup = () => {
      window.removeEventListener('blur', onBlur);
      document.body.removeChild(testFrame);
    };

    window.addEventListener('blur', onBlur);

    try {
      window.location.href = 'sip:test@test.invalid';
      // If we get here without error and blur fires, protocol is registered
    } catch {
      setProtocolStatus('unsupported');
      clearTimeout(timeout);
      cleanup();
    }
  };

  const defaultAccount = sipAccounts?.find(a => a.is_default) ?? sipAccounts?.[0];

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guia de Configuração — MicroSIP</h1>
          <p className="text-muted-foreground mt-1">
            Configure o MicroSIP para realizar chamadas via Click-to-Call integrado ao Bitrix24
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              {sipAccounts && sipAccounts.length > 0 ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-8 w-8 text-destructive shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">Contas SIP</p>
                <p className="text-xs text-muted-foreground">
                  {sipAccounts && sipAccounts.length > 0
                    ? `${sipAccounts.length} conta(s) cadastrada(s)`
                    : 'Nenhuma conta cadastrada'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              {protocolStatus === 'supported' ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
              ) : protocolStatus === 'unsupported' ? (
                <AlertTriangle className="h-8 w-8 text-yellow-500 shrink-0" />
              ) : (
                <Phone className="h-8 w-8 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">Protocolo SIP</p>
                <p className="text-xs text-muted-foreground">
                  {protocolStatus === 'untested' && 'Não verificado'}
                  {protocolStatus === 'testing' && 'Verificando...'}
                  {protocolStatus === 'supported' && 'Handler detectado'}
                  {protocolStatus === 'unsupported' && 'Handler não detectado'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Button size="sm" variant="outline" onClick={testSipProtocol} disabled={protocolStatus === 'testing'}>
                <Shield className="mr-2 h-4 w-4" />
                Testar Protocolo
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Step 1 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="rounded-full h-8 w-8 flex items-center justify-center text-sm bg-primary text-primary-foreground">1</Badge>
              <div>
                <CardTitle className="text-lg">Baixar e instalar o MicroSIP</CardTitle>
                <CardDescription>Softphone gratuito e leve para Windows</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O MicroSIP é um softphone SIP open-source para Windows. Ele intercepta as URIs <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sip:</code> que o conector dispara ao clicar em "Ligar".
            </p>
            <div className="flex gap-3">
              <Button asChild variant="default">
                <a href="https://www.microsip.org/downloads" target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download MicroSIP
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </div>
            <Alert>
              <Monitor className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Baixe a versão <strong>com codec</strong> (installer completo). A versão "lite" pode não ter codecs necessários para seu provedor SIP.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="rounded-full h-8 w-8 flex items-center justify-center text-sm bg-primary text-primary-foreground">2</Badge>
              <div>
                <CardTitle className="text-lg">Configurar conta SIP no MicroSIP</CardTitle>
                <CardDescription>Use as mesmas credenciais cadastradas no painel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No MicroSIP, acesse <strong>Menu → Add Account</strong> e preencha os campos:
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Config fields */}
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" /> Campos de configuração
                  </h4>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {[
                      { label: 'Nome da Conta', value: defaultAccount?.display_name, fallback: 'ex: Syma' },
                      { label: 'Servidor SIP', value: defaultAccount?.sip_server, fallback: 'ex: sip.seuprovedor.com.br' },
                      { label: 'Proxy SIP', value: defaultAccount?.sip_server, fallback: 'mesmo que Servidor SIP' },
                      { label: 'Usuário', value: defaultAccount?.sip_username, fallback: 'seu usuário SIP' },
                      { label: 'Domínio', value: defaultAccount?.sip_domain || defaultAccount?.sip_server, fallback: 'mesmo que Servidor SIP' },
                      { label: 'Login', value: defaultAccount?.sip_username, fallback: 'mesmo que Usuário' },
                      { label: 'Senha', value: '••••••••', fallback: 'sua senha SIP' },
                      { label: 'Nome de Exibição', value: defaultAccount?.display_name, fallback: 'seu nome' },
                      { label: 'Criptografia', value: 'Desabilitado', fallback: 'Desabilitado' },
                      { label: 'Transporte', value: 'UDP', fallback: 'UDP' },
                    ].map((field) => (
                      <div key={field.label} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{field.label}:</span>
                        <code className="rounded bg-muted px-2 py-0.5 text-xs font-medium truncate max-w-[200px]">
                          {field.value || field.fallback}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>

                {!defaultAccount && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhuma conta SIP cadastrada.{' '}
                      <a href="/settings" className="underline font-medium">Cadastre uma conta</a> antes de continuar.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Screenshot */}
              <div className="rounded-lg border overflow-hidden bg-muted/20">
                <img src={microsipImg} alt="Tela de configuração do MicroSIP" className="w-full h-auto" />
                <p className="text-xs text-center text-muted-foreground py-2">Exemplo da tela Account Settings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="rounded-full h-8 w-8 flex items-center justify-center text-sm bg-primary text-primary-foreground">3</Badge>
              <div>
                <CardTitle className="text-lg">Associar protocolo SIP</CardTitle>
                <CardDescription>Permita que o navegador abra chamadas no MicroSIP</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para que o Click-to-Call funcione, o MicroSIP precisa ser o handler do protocolo <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sip:</code>.
            </p>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ChevronRight className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">No MicroSIP:</p>
                  <p className="text-muted-foreground">Menu → Settings → marque <strong>"Associate with SIP protocol"</strong></p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <ChevronRight className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">No Windows (se necessário):</p>
                  <p className="text-muted-foreground">Configurações → Apps → Apps padrão → pesquise "SIP" → selecione MicroSIP</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <ChevronRight className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">No navegador:</p>
                  <p className="text-muted-foreground">Quando o Chrome perguntar "Abrir MicroSIP?", marque <strong>"Sempre permitir"</strong> e clique em Abrir</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="rounded-full h-8 w-8 flex items-center justify-center text-sm bg-primary text-primary-foreground">4</Badge>
              <div>
                <CardTitle className="text-lg">Testar a chamada</CardTitle>
                <CardDescription>Verifique se tudo funciona corretamente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p><strong>1.</strong> Certifique-se de que o MicroSIP está aberto e registrado (ícone <span className="inline-flex items-center"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-0.5" /></span> verde na barra de tarefas)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p><strong>2.</strong> Vá em <a href="/contacts" className="underline text-primary font-medium">Contatos</a> e clique no ícone <Phone className="inline h-3.5 w-3.5 mx-0.5" /> ao lado de um número</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p><strong>3.</strong> O MicroSIP deve abrir e iniciar a chamada automaticamente</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Volume2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p><strong>4.</strong> Verifique o áudio — se não ouvir nada, confira os dispositivos de áudio no MicroSIP (Settings → Audio)</p>
                </div>
              </div>
            </div>

            {protocolStatus === 'unsupported' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  O protocolo <code>sip:</code> não foi detectado neste navegador. Verifique se o MicroSIP está instalado e associado ao protocolo SIP (Passo 3).
                </AlertDescription>
              </Alert>
            )}

            {protocolStatus === 'supported' && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <AlertDescription>
                  Protocolo <code>sip:</code> detectado! O Click-to-Call deve funcionar corretamente.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resolução de problemas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              {[
                {
                  q: 'MicroSIP não registra (ícone vermelho)',
                  a: 'Verifique servidor, usuário e senha. Confirme que a porta 5060/UDP está liberada no firewall. Alguns provedores SIP exigem IP fixo autorizado.',
                },
                {
                  q: 'Clicar em "Ligar" não abre o MicroSIP',
                  a: 'Vá em Settings do MicroSIP e marque "Associate with SIP protocol". No Windows, defina o MicroSIP como app padrão para o protocolo SIP.',
                },
                {
                  q: 'Chamada conecta mas sem áudio',
                  a: 'Verifique os dispositivos de áudio em MicroSIP → Settings → Audio. Certifique-se de que os codecs G.711 (PCMA/PCMU) estão habilitados.',
                },
                {
                  q: 'Erro 403 Forbidden ao ligar',
                  a: 'O trunk SIP pode ter restrição de IP. Verifique com sua operadora se o IP da sua conexão está autorizado.',
                },
              ].map((item) => (
                <div key={item.q} className="rounded-lg border p-3">
                  <p className="font-medium">{item.q}</p>
                  <p className="text-muted-foreground mt-1">{item.a}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

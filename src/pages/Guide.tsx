import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Download, ExternalLink, Info, Mic, Settings, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { useStatus } from '@/hooks/useStatus';
import microsipImg from '@/assets/microsip-config-example.png';

function Section({ n, title, description, children }: { n: number; title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" aria-hidden="true">
            {n}
          </span>
          <div className="space-y-1">
            <CardTitle className="text-lg">
              <span className="sr-only">Passo {n}: </span>
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">{children}</CardContent>
    </Card>
  );
}

function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <p className="flex items-start gap-2">
      <Icon className={ok ? 'mt-0.5 h-4 w-4 shrink-0 text-success' : 'mt-0.5 h-4 w-4 shrink-0 text-destructive'} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

const ACCOUNT_FIELDS: Array<[string, string]> = [
  ['Nome da conta', 'Qualquer nome, ex.: Ramal 201'],
  ['Servidor SIP', 'Endereço do seu PABX/operadora'],
  ['Proxy SIP', 'Igual ao servidor (ou em branco)'],
  ['Usuário', 'Seu ramal ou usuário SIP'],
  ['Domínio', 'Igual ao servidor'],
  ['Login', 'Igual ao usuário'],
  ['Senha', 'Sua senha SIP'],
  ['Transporte', 'UDP (padrão)'],
];

const TROUBLESHOOTING = [
  {
    q: 'O MicroSIP não registra (ícone vermelho)',
    a: 'Confira servidor, usuário e senha. Verifique se a porta 5060/UDP está liberada no firewall e se a operadora exige IP autorizado.',
  },
  {
    q: 'Clico no telefone no Bitrix24 e nada acontece',
    a: 'Confirme que este aplicativo está aberto, que "Receber cliques do Bitrix24" está ligado em Configurações e que a linha VoipSip é a padrão de saída na telefonia do Bitrix24. Veja a tela Diagnóstico para erros.',
  },
  {
    q: 'As chamadas não aparecem no histórico do Bitrix24',
    a: 'Os hooks podem ter sido apagados pelo MicroSIP. Feche o MicroSIP e clique em "Configurar MicroSIP automaticamente" novamente.',
  },
  {
    q: 'A gravação não foi anexada',
    a: 'Verifique se a gravação está ativa no MicroSIP e se a pasta de gravações em Configurações → MicroSIP é a mesma usada pelo MicroSIP.',
  },
  {
    q: 'A chamada conecta mas não há áudio',
    a: 'Confira os dispositivos em MicroSIP → Settings → Audio e se os codecs G.711 (PCMA/PCMU) estão habilitados.',
  },
  {
    q: 'Erro 403 Forbidden ao ligar',
    a: 'O tronco SIP pode ter restrição de IP. Confirme com a operadora se o IP da sua conexão está autorizado.',
  },
];

export default function Guide() {
  const { data: status } = useStatus();
  const microsip = status?.microsip;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Guia do MicroSIP" description="Como preparar o MicroSIP para ligar e receber chamadas integradas ao Bitrix24." />

      {microsip && !microsip.supported && (
        <Alert>
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>O MicroSIP só roda no Windows. Neste computador, use o softphone embutido (WebRTC).</AlertDescription>
        </Alert>
      )}

      <Section n={1} title="Baixar e instalar o MicroSIP" description="Softphone SIP gratuito e leve para Windows.">
        <Button asChild>
          <a href="https://www.microsip.org/downloads" target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Baixar MicroSIP
            <ExternalLink className="ml-2 h-3 w-3" aria-hidden="true" />
            <span className="sr-only">(abre em nova janela)</span>
          </a>
        </Button>
        <p className="text-muted-foreground">
          Prefira o instalador completo. O conector procura o MicroSIP nas pastas padrão de instalação; se você instalou em outro lugar, informe o caminho em
          Configurações.
        </p>
        {microsip && <Check ok={!!microsip.exe}>{microsip.exe ? `Encontrado em ${microsip.exe}` : 'MicroSIP ainda não encontrado neste computador'}</Check>}
      </Section>

      <Section n={2} title="Configurar a conta SIP no MicroSIP" description="Use os dados do seu ramal fornecidos pelo PABX ou operadora.">
        <p className="text-muted-foreground">
          No MicroSIP, abra <strong className="text-foreground">Menu → Add Account</strong> e preencha:
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <dl className="divide-y rounded-lg border">
            {ACCOUNT_FIELDS.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-3 py-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <figure className="overflow-hidden rounded-lg border bg-muted/20">
            <img src={microsipImg} alt="Tela Account do MicroSIP com os campos de servidor, usuário e senha preenchidos" className="h-auto w-full" loading="lazy" />
            <figcaption className="py-2 text-center text-xs text-muted-foreground">Exemplo da tela de conta do MicroSIP</figcaption>
          </figure>
        </div>
      </Section>

      <Section n={3} title="Integração automática" description="O conector configura o MicroSIP por você — não é preciso copiar URLs.">
        <p className="text-muted-foreground">
          Feche o MicroSIP (inclusive na bandeja do Windows) e clique em <strong className="text-foreground">Configurar MicroSIP automaticamente</strong>. O
          conector grava no <code className="rounded bg-muted px-1">microsip.ini</code> pequenos scripts que avisam este aplicativo quando uma chamada toca, é
          atendida ou termina. Assim cada chamada é registrada no CRM do Bitrix24.
        </p>
        {microsip && (
          <Check ok={microsip.ini.hooksConfigured}>
            {microsip.ini.hooksConfigured ? 'Integração configurada' : 'Integração ainda não configurada'}
            {microsip.ini.file && <span className="block break-all font-mono text-xs text-muted-foreground">{microsip.ini.file}</span>}
          </Check>
        )}
        <Button variant="outline" asChild>
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
            Abrir configurações do MicroSIP
          </Link>
        </Button>
      </Section>

      <Section n={4} title="Gravações enviadas ao Bitrix24" description="Ouça as chamadas direto no histórico do CRM.">
        <p className="flex items-start gap-2 text-muted-foreground">
          <Mic className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Mantenha a gravação ativa no MicroSIP (Settings → <strong className="text-foreground">Auto record calls</strong>); a configuração automática já a
            liga. Ao fim de cada chamada, o conector procura o arquivo na pasta de gravações do MicroSIP e o anexa à chamada no Bitrix24.
          </span>
        </p>
        {microsip?.recordingsDir && (
          <p className="text-muted-foreground">
            Pasta em uso: <code className="break-all rounded bg-muted px-1">{microsip.recordingsDir}</code>
          </p>
        )}
      </Section>

      <Section n={5} title="Números do Bitrix24" description="Como o número clicado vira o número discado.">
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            O Bitrix24 guarda telefones com o código do país (+55). O conector <strong className="text-foreground">remove o DDI 55</strong> antes de discar —
            ex.: +55 11 99999-0000 vira 11999990000.
          </li>
          <li>Se o seu PABX exige um dígito para linha externa (ex.: 0), defina o prefixo de discagem em Configurações → Discagem.</li>
          <li>Para testar, use “Testar discagem” em Configurações ou clique em um telefone de um contato no CRM.</li>
        </ul>
      </Section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resolução de problemas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {TROUBLESHOOTING.map(({ q, a }) => (
            <div key={q} className="rounded-lg border p-3">
              <p className="font-medium">{q}</p>
              <p className="mt-1 text-muted-foreground">{a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

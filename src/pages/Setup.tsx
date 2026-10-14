import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Brand } from '@/components/layout/Brand';
import { LoadingScreen, ServerUnavailable } from '@/components/common/ScreenStates';
import { Stepper } from '@/components/setup/Stepper';
import { StepCreateApp } from '@/components/setup/StepCreateApp';
import { StepConnect } from '@/components/setup/StepConnect';
import { StepSoftphone } from '@/components/setup/StepSoftphone';
import { StepDefaultLine } from '@/components/setup/StepDefaultLine';
import { useStatus } from '@/hooks/useStatus';
import { usePhone } from '@/hooks/usePhone';
import type { Status } from '@/lib/api';
import type { SetupLocationState } from '@/lib/setup-route';

const STEPS = [
  { title: 'Criar aplicativo', heading: 'Criar aplicativo local no Bitrix24', description: 'Leva cerca de 2 minutos e precisa ser feito uma única vez por um administrador.' },
  { title: 'Conectar', heading: 'Conectar ao Bitrix24', description: 'Cole as chaves do aplicativo local que você acabou de criar.' },
  { title: 'Softphone', heading: 'Escolher o softphone', description: 'Defina por onde as chamadas serão feitas e recebidas neste computador.' },
  { title: 'Telefonia padrão', heading: 'Definir como telefonia padrão', description: 'Último passo: faça o Bitrix24 usar o conector ao clicar em um telefone.' },
];

function SetupWizard({ status }: { status: Status }) {
  const navigate = useNavigate();
  const routeState = (useLocation().state ?? {}) as SetupLocationState;
  const { account } = usePhone();
  const connected = status.bitrix.connected;
  const [current, setCurrent] = useState(() => Math.min(Math.max((routeState.step ?? (connected ? 3 : 1)) - 1, 0), connected ? 3 : 1));

  const softphoneReady = status.dial.mode === 'microsip' ? status.microsip.ini.hooksConfigured : !!account;
  const completed = (i: number) => (i <= 1 ? connected : i === 2 ? softphoneReady : false);
  const step = STEPS[current];
  const isLast = current === STEPS.length - 1;
  const canAdvance = current === 0 || connected;

  return (
    <div className="space-y-6">
      <Stepper
        steps={STEPS.map((s, i) => ({ title: s.title, locked: i >= 2 && !connected }))}
        current={current}
        completed={completed}
        onSelect={setCurrent}
      />

      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Etapa {current + 1} de {STEPS.length}
          </p>
          <CardTitle className="text-xl">{step.heading}</CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {current === 0 && <StepCreateApp status={status} />}
          {current === 1 && <StepConnect status={status} error={routeState.error} />}
          {current === 2 && <StepSoftphone status={status} />}
          {current === 3 && <StepDefaultLine status={status} />}
        </CardContent>
        <CardFooter className="justify-between gap-2 border-t pt-6">
          <Button variant="ghost" onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Voltar
          </Button>
          {isLast ? (
            <Button onClick={() => navigate('/', { replace: true })}>
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              Concluir
            </Button>
          ) : (
            canAdvance && (
              <Button variant={current === 1 ? 'outline' : 'default'} onClick={() => setCurrent((c) => c + 1)}>
                {current === 0 ? 'Já criei o aplicativo' : 'Próximo'}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            )
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function Setup() {
  const { data: status, isLoading, error, refetch } = useStatus();

  if (isLoading) return <LoadingScreen />;
  if (!status) return <ServerUnavailable error={error} onRetry={() => void refetch()} />;

  return (
    <div className="min-h-screen bg-muted/30 pb-28">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Brand />
          <span className="text-muted-foreground">· Configuração inicial</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <SetupWizard status={status} />
      </main>
    </div>
  );
}

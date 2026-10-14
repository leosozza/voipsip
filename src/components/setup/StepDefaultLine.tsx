import { MousePointerClick } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Instruction, Instructions, MenuPath } from '@/components/setup/Instructions';
import type { Status } from '@/lib/api';

export function StepDefaultLine({ status }: { status: Status }) {
  const lineName = `VoipSip ${status.bitrix.lineNumber ?? 'MicroSIP'}`;

  return (
    <div className="space-y-6">
      <Instructions>
        <Instruction n={1} title="No Bitrix24, abra as configurações de telefonia">
          <p>
            <MenuPath items={['Telefonia', 'Configurações']} />
          </p>
        </Instruction>
        <Instruction n={2} title='Em "Número padrão para chamadas de saída", selecione a linha do conector'>
          <p>
            Escolha <strong className="font-medium text-foreground">{lineName}</strong>. Ela foi criada automaticamente quando você conectou o Bitrix24.
          </p>
        </Instruction>
        <Instruction n={3} title="Prefere configurar por usuário?">
          <p>
            Cada colaborador pode escolher a linha no próprio perfil do Bitrix24, em <MenuPath items={['Perfil', 'Telefonia', 'Número de saída']} />.
          </p>
        </Instruction>
      </Instructions>

      <Alert>
        <MousePointerClick className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Pronto: clique para ligar</AlertTitle>
        <AlertDescription>
          A partir de agora, clicar em qualquer telefone de um contato, empresa, lead ou negócio no CRM do Bitrix24 inicia a chamada pelo
          seu softphone. As chamadas são registradas no histórico do CRM automaticamente.
        </AlertDescription>
      </Alert>
    </div>
  );
}

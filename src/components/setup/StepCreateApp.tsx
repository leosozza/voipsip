import { CopyField } from '@/components/common/CopyField';
import { Badge } from '@/components/ui/badge';
import { Instruction, Instructions, MenuPath } from '@/components/setup/Instructions';
import type { Status } from '@/lib/api';

const SCOPES = [
  { scope: 'telephony', label: 'Telefonia' },
  { scope: 'crm', label: 'CRM' },
  { scope: 'user', label: 'Usuários' },
];

export function StepCreateApp({ status }: { status: Status }) {
  return (
    <Instructions>
      <Instruction n={1} title="Abra o seu Bitrix24 como administrador">
        <p>
          No menu lateral, vá em <MenuPath items={['Aplicativos', 'Recursos do desenvolvedor', 'Outros', 'Aplicativo local']} />.
        </p>
      </Instruction>
      <Instruction n={2} title='Em "Tipo", escolha Servidor'>
        <p>O conector roda neste computador e conversa com o Bitrix24 pela API REST.</p>
      </Instruction>
      <Instruction n={3} title='Cole o "Caminho do seu manipulador"'>
        <CopyField value={status.handlerUrl} label="caminho do manipulador" />
        <p>
          Deixe o campo <strong className="font-medium text-foreground">Caminho de instalação inicial</strong> vazio.
        </p>
      </Instruction>
      <Instruction n={4} title="Marque as permissões">
        <ul className="flex flex-wrap gap-2" aria-label="Permissões necessárias">
          {SCOPES.map(({ scope, label }) => (
            <li key={scope}>
              <Badge variant="secondary" className="gap-1.5 font-normal">
                {label}
                <code className="text-muted-foreground">({scope})</code>
              </Badge>
            </li>
          ))}
        </ul>
      </Instruction>
      <Instruction n={5} title="Clique em Salvar e copie as chaves">
        <p>
          O Bitrix24 mostrará o <strong className="font-medium text-foreground">Código do aplicativo (client_id)</strong> e a{' '}
          <strong className="font-medium text-foreground">Chave do aplicativo (client_secret)</strong>. Você vai colá-los na próxima etapa.
        </p>
      </Instruction>
    </Instructions>
  );
}

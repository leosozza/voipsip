import { PageHeader } from '@/components/common/PageHeader';
import { LoadingScreen } from '@/components/common/ScreenStates';
import { BitrixCard } from '@/components/settings/BitrixCard';
import { DialSettingsCard } from '@/components/settings/DialSettingsCard';
import { MicroSipCard } from '@/components/settings/MicroSipCard';
import { SipAccountsCard } from '@/components/settings/SipAccountsCard';
import { useStatus } from '@/hooks/useStatus';

export default function Settings() {
  const { data: status } = useStatus();
  if (!status) return <LoadingScreen />;

  const microsipFirst = status.dial.mode === 'microsip';

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Conexão com o Bitrix24, regras de discagem e softphone." />
      <div className="grid gap-6 lg:grid-cols-2">
        <BitrixCard status={status} />
        <DialSettingsCard status={status} />
      </div>
      {microsipFirst ? <MicroSipCard status={status} /> : <SipAccountsCard />}
      {microsipFirst ? <SipAccountsCard /> : <MicroSipCard status={status} />}
    </div>
  );
}

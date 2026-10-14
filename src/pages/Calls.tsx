import { PageHeader } from '@/components/common/PageHeader';
import { CallsView } from '@/components/calls/CallsView';

export default function Calls() {
  return (
    <div className="space-y-6">
      <PageHeader title="Chamadas" description="Histórico das últimas 200 chamadas feitas e recebidas neste computador." />
      <CallsView limit={200} />
    </div>
  );
}

import { useCallLogs } from '@/hooks/useCallLogs';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { CallsChart } from '@/components/dashboard/CallsChart';

interface Props {
  companyId: string;
}

export function BitrixDashboardTab({ companyId }: Props) {
  const { callLogs, metrics, isLoading } = useCallLogs(companyId);

  return (
    <div className="space-y-6">
      <MetricsCards metrics={metrics} isLoading={isLoading} />
      <CallsChart callLogs={callLogs} isLoading={isLoading} />
    </div>
  );
}

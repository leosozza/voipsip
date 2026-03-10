import { AppLayout } from '@/components/layout/AppLayout';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { CallsChart } from '@/components/dashboard/CallsChart';
import { CallLogTable } from '@/components/calls/CallLogTable';
import { useCompany } from '@/hooks/useCompany';
import { useCallLogs } from '@/hooks/useCallLogs';

export default function Dashboard() {
  const { currentCompany, isLoading: isLoadingCompany } = useCompany();
  const { callLogs, metrics, isLoading: isLoadingCalls } = useCallLogs(currentCompany?.id);

  if (isLoadingCompany) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral das suas chamadas</p>
        </div>
        <MetricsCards metrics={metrics} isLoading={isLoadingCalls} />
        <div className="grid gap-6 lg:grid-cols-2">
          <CallsChart callLogs={callLogs} isLoading={isLoadingCalls} />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Chamadas Recentes</h3>
            <CallLogTable callLogs={callLogs.slice(0, 5)} isLoading={isLoadingCalls} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { CallsChart } from '@/components/dashboard/CallsChart';
import { CallLogTable } from '@/components/calls/CallLogTable';
import { useCalls, useCallStats } from '@/hooks/useCalls';

const DAYS = 7;

/** Metrics of the last 7 days, calls per day and the 10 most recent calls. */
export function DashboardView({ recentAction }: { recentAction?: ReactNode }) {
  const stats = useCallStats(DAYS);
  const recent = useCalls(10);

  return (
    <div className="space-y-6">
      <section aria-label={`Resumo dos últimos ${DAYS} dias`}>
        <MetricsCards totals={stats.data?.totals} isLoading={stats.isLoading} />
      </section>
      <CallsChart perDay={stats.data?.perDay} days={DAYS} isLoading={stats.isLoading} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Últimas chamadas</CardTitle>
          {recentAction}
        </CardHeader>
        <CardContent>
          <CallLogTable calls={recent.data} isLoading={recent.isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}

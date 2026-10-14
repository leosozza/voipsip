import { Clock, Phone, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CallStats } from '@/lib/api';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Metric {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent: string;
}

function buildMetrics(totals: CallStats['totals']): Metric[] {
  const answered = totals.answered ?? 0;
  const average = answered > 0 ? totals.duration / answered : 0;
  return [
    { title: 'Total', value: totals.total, icon: Phone, accent: 'bg-primary/10 text-primary' },
    { title: 'Recebidas', value: totals.inbound ?? 0, icon: PhoneIncoming, accent: 'bg-success/15 text-success' },
    { title: 'Realizadas', value: totals.outbound ?? 0, icon: PhoneOutgoing, accent: 'bg-info/15 text-info' },
    { title: 'Atendidas', value: answered, icon: PhoneCall, accent: 'bg-success/15 text-success' },
    { title: 'Perdidas', value: totals.missed ?? 0, icon: PhoneMissed, accent: 'bg-destructive/10 text-destructive' },
    {
      title: 'Tempo em chamada',
      value: formatDuration(totals.duration),
      hint: `Média ${formatDuration(average)} por chamada atendida`,
      icon: Clock,
      accent: 'bg-warning/20 text-warning-foreground dark:text-warning',
    },
  ];
}

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6';

export function MetricsCards({ totals, isLoading }: { totals?: CallStats['totals']; isLoading?: boolean }) {
  if (isLoading || !totals) {
    return (
      <div className={GRID} aria-busy="true" aria-label="Carregando métricas">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className={GRID}>
      {buildMetrics(totals).map(({ title, value, hint, icon: Icon, accent }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <span className={cn('rounded-md p-1.5', accent)} aria-hidden="true">
              <Icon className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="whitespace-nowrap text-2xl font-bold tabular-nums">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

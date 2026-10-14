import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CallStats } from '@/lib/api';
import { buildChartData } from '@/lib/stats';

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function CallsChart({ perDay, days = 7, isLoading }: { perDay?: CallStats['perDay']; days?: number; isLoading?: boolean }) {
  const data = useMemo(() => buildChartData(perDay ?? [], days), [perDay, days]);
  const animate = !prefersReducedMotion();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chamadas por dia</CardTitle>
        <CardDescription>Últimos {days} dias</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : (
          <div className="h-[260px]" role="img" aria-label={`Gráfico de chamadas recebidas e realizadas nos últimos ${days} dias`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="inbound" name="Recebidas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} isAnimationActive={animate} />
                <Bar dataKey="outbound" name="Realizadas" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} isAnimationActive={animate} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CallStats } from '@/lib/api';

const DAY_MS = 86_400_000;

export interface ChartDay {
  day: string;
  label: string;
  inbound: number;
  outbound: number;
}

/** Fills the gaps so every one of the last `days` days has a bar (server days are UTC dates). */
export function buildChartData(perDay: CallStats['perDay'], days: number, now = Date.now()): ChartDay[] {
  const byDay = new Map(perDay.map((d) => [d.day, d]));
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(now - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10);
    const row = byDay.get(day);
    return {
      day,
      label: format(new Date(`${day}T12:00:00Z`), 'EEE dd', { locale: ptBR }),
      inbound: Number(row?.inbound ?? 0),
      outbound: Number(row?.outbound ?? 0),
    };
  });
}

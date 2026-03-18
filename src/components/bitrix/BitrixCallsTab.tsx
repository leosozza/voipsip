import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, CalendarIcon } from 'lucide-react';
import { useCallLogs } from '@/hooks/useCallLogs';
import { CallLogTable } from '@/components/calls/CallLogTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface Props {
  companyId: string;
}

export function BitrixCallsTab({ companyId }: Props) {
  const [direction, setDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { callLogs, isLoading } = useCallLogs(companyId, {
    direction: direction !== 'all' ? direction : undefined,
    status: status !== 'all' ? status : undefined,
    startDate: dateRange.from,
    endDate: dateRange.to,
  });

  const hasFilters = direction !== 'all' || status !== 'all' || dateRange.from;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="inbound">Recebidas</SelectItem>
            <SelectItem value="outbound">Realizadas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="answered">Atendidas</SelectItem>
            <SelectItem value="missed">Perdidas</SelectItem>
            <SelectItem value="voicemail">Correio de voz</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateRange.from
                ? `${format(dateRange.from, 'dd/MM', { locale: ptBR })}${dateRange.to ? ` - ${format(dateRange.to, 'dd/MM', { locale: ptBR })}` : ''}`
                : 'Período'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange as any}
              onSelect={(range: any) => setDateRange(range || {})}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setDirection('all'); setStatus('all'); setDateRange({}); }}>
            <Filter className="mr-1 h-4 w-4" /> Limpar
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">{callLogs.length} chamadas</span>
      </div>

      <CallLogTable callLogs={callLogs} isLoading={isLoading} />
    </div>
  );
}

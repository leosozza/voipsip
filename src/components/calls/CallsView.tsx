import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CallLogTable } from '@/components/calls/CallLogTable';
import { useCalls } from '@/hooks/useCalls';
import type { CallStatus } from '@/lib/api';
import { filterCalls, onlyDigits, type DirectionFilter, type StatusFilter } from '@/lib/call-filters';
import { CALL_STATUS } from '@/lib/format';

/** Call history with direction/status filters and number search. */
export function CallsView({ limit = 200 }: { limit?: number }) {
  const { data: calls, isLoading } = useCalls(limit);
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => filterCalls(calls ?? [], direction, status, search), [calls, direction, status, search]);
  const isFiltering = direction !== 'all' || status !== 'all' || !!onlyDigits(search);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="calls-search">Buscar número</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="calls-search"
              type="search"
              inputMode="tel"
              placeholder="Ex.: 11 99999-0000"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calls-direction">Direção</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as DirectionFilter)}>
            <SelectTrigger id="calls-direction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="inbound">Recebidas</SelectItem>
              <SelectItem value="outbound">Realizadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calls-status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger id="calls-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(Object.keys(CALL_STATUS) as CallStatus[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {CALL_STATUS[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {isFiltering ? `${filtered.length} de ${calls?.length ?? 0} chamadas` : `${calls?.length ?? 0} chamadas`}
        </p>
      )}

      <CallLogTable
        calls={filtered}
        isLoading={isLoading}
        emptyMessage={isFiltering ? 'Nenhuma chamada corresponde aos filtros.' : undefined}
      />
    </div>
  );
}

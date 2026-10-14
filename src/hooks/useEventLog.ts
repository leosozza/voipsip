import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useEventLog(refetchInterval = 5_000) {
  return useQuery({ queryKey: queryKeys.eventLog, queryFn: api.eventLog, refetchInterval });
}

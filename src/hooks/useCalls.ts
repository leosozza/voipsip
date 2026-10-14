import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useCalls(limit = 200) {
  return useQuery({ queryKey: [...queryKeys.calls, limit], queryFn: () => api.calls(limit) });
}

export function useCallStats(days = 7) {
  return useQuery({ queryKey: [...queryKeys.callStats, days], queryFn: () => api.callStats(days) });
}

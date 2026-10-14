import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type SettingsPatch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useStatus(refetchInterval = 10_000) {
  return useQuery({ queryKey: queryKeys.status, queryFn: api.status, refetchInterval });
}

/** PUT /api/settings and refresh the status afterwards. */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => api.updateSettings(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.status }),
  });
}

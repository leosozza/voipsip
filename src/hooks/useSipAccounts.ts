import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type SipAccount, type SipAccountInput } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useSipAccounts() {
  return useQuery({ queryKey: queryKeys.sipAccounts, queryFn: api.sipAccounts });
}

/** The account the built-in softphone registers with: the default one, or the first. */
export function pickDefaultAccount(accounts: SipAccount[] | undefined): SipAccount | null {
  if (!accounts?.length) return null;
  return accounts.find((a) => a.is_default === 1) ?? accounts[0];
}

export function useSipAccountMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: queryKeys.sipAccounts });
  return {
    create: useMutation({ mutationFn: (input: SipAccountInput) => api.createSipAccount(input), onSuccess }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<SipAccountInput> }) => api.updateSipAccount(id, input),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.deleteSipAccount(id), onSuccess }),
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SipAccount } from '@/types/voip';

export function useSipAccounts(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: sipAccounts, isLoading } = useQuery({
    queryKey: ['sip-accounts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('sip_accounts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as SipAccount[];
    },
    enabled: !!companyId,
  });

  const addSipAccount = useMutation({
    mutationFn: async (account: Omit<SipAccount, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!companyId) throw new Error('Company not found');
      const { error } = await supabase
        .from('sip_accounts')
        .insert({ company_id: companyId, ...account } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sip-accounts', companyId] }); },
  });

  const updateSipAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SipAccount> & { id: string }) => {
      const { error } = await supabase
        .from('sip_accounts')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sip-accounts', companyId] }); },
  });

  const deleteSipAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sip_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sip-accounts', companyId] }); },
  });

  const defaultAccount = sipAccounts?.find(a => a.is_default) ?? sipAccounts?.[0] ?? null;

  return { sipAccounts: sipAccounts ?? [], defaultAccount, isLoading, addSipAccount, updateSipAccount, deleteSipAccount };
}

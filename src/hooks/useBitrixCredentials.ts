import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BitrixCredentials {
  id: string;
  company_id: string;
  bitrix_domain: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useBitrixCredentials(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: credentials, isLoading } = useQuery({
    queryKey: ['bitrix-credentials', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('bitrix_credentials')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data as BitrixCredentials | null;
    },
    enabled: !!companyId,
  });

  const saveBitrixCredentials = useMutation({
    mutationFn: async (params: { bitrix_domain: string; access_token?: string; refresh_token?: string }) => {
      if (!companyId) throw new Error('Empresa não encontrada');

      if (credentials) {
        const { error } = await supabase
          .from('bitrix_credentials')
          .update({
            bitrix_domain: params.bitrix_domain,
            ...(params.access_token && { access_token: params.access_token }),
            ...(params.refresh_token && { refresh_token: params.refresh_token }),
          })
          .eq('id', credentials.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bitrix_credentials')
          .insert({
            company_id: companyId,
            bitrix_domain: params.bitrix_domain,
            access_token: params.access_token || null,
            refresh_token: params.refresh_token || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bitrix-credentials', companyId] });
    },
  });

  const deleteBitrixCredentials = useMutation({
    mutationFn: async () => {
      if (!credentials) return;
      const { error } = await supabase
        .from('bitrix_credentials')
        .delete()
        .eq('id', credentials.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bitrix-credentials', companyId] });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('bitrix-sync', {
        body: { action: 'test', company_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });

  const syncCallToBitrix = useMutation({
    mutationFn: async (callData: {
      phone_number: string;
      direction: 'inbound' | 'outbound';
      duration: number;
      status_code?: number;
      recording_url?: string;
      user_id?: number;
      line_number?: string;
    }) => {
      if (!companyId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('bitrix-sync', {
        body: {
          action: 'register_and_finish',
          company_id: companyId,
          call_data: callData,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });

  const isConnected = !!credentials?.access_token;
  const isExpired = credentials?.expires_at
    ? new Date(credentials.expires_at) < new Date()
    : false;

  return {
    credentials,
    isLoading,
    isConnected,
    isExpired,
    saveBitrixCredentials,
    deleteBitrixCredentials,
    testConnection,
    syncCallToBitrix,
  };
}

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

interface ExternalLine {
  NUMBER: string;
  NAME?: string;
  CRM_AUTO_CREATE?: number;
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
      call_start_date?: string;
      user_phone_inner?: string;
      crm_source?: string;
      filename?: string;
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

  // External lines management
  const getExternalLines = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('bitrix-sync', {
        body: { action: 'get_external_lines', company_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.result as ExternalLine[];
    },
  });

  const addExternalLine = useMutation({
    mutationFn: async (lineData: { number: string; name?: string; crm_auto_create?: number }) => {
      if (!companyId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('bitrix-sync', {
        body: { action: 'add_external_line', company_id: companyId, call_data: lineData },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });

  const deleteExternalLine = useMutation({
    mutationFn: async (number: string) => {
      if (!companyId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('bitrix-sync', {
        body: { action: 'delete_external_line', company_id: companyId, call_data: { number } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });

  // Event binding
  const bindEvents = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('bitrix-sync', {
        body: { action: 'bind_events', company_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });

  const unbindEvents = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('bitrix-sync', {
        body: { action: 'unbind_events', company_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });

  // Search CRM
  const searchCrm = useMutation({
    mutationFn: async (phoneNumber: string) => {
      if (!companyId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('bitrix-sync', {
        body: { action: 'search_crm', company_id: companyId, call_data: { phone_number: phoneNumber } },
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
    getExternalLines,
    addExternalLine,
    deleteExternalLine,
    bindEvents,
    unbindEvents,
    searchCrm,
  };
}

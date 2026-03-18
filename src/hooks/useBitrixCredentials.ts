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

  // Helper to invoke bitrix-sync
  const invokeBitrixSync = async (action: string, callData?: any) => {
    if (!companyId) throw new Error('Empresa não encontrada');
    const { data, error } = await supabase.functions.invoke('bitrix-sync', {
      body: { action, company_id: companyId, call_data: callData },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const testConnection = useMutation({
    mutationFn: () => invokeBitrixSync('test'),
  });

  const syncCallToBitrix = useMutation({
    mutationFn: (callData: {
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
    }) => invokeBitrixSync('register_and_finish', callData),
  });

  const getExternalLines = useMutation({
    mutationFn: async () => {
      const data = await invokeBitrixSync('get_external_lines');
      return data?.result as ExternalLine[];
    },
  });

  const addExternalLine = useMutation({
    mutationFn: (lineData: { number: string; name?: string; crm_auto_create?: number }) =>
      invokeBitrixSync('add_external_line', lineData),
  });

  const deleteExternalLine = useMutation({
    mutationFn: (number: string) =>
      invokeBitrixSync('delete_external_line', { number }),
  });

  const bindEvents = useMutation({
    mutationFn: () => invokeBitrixSync('bind_events'),
  });

  const unbindEvents = useMutation({
    mutationFn: () => invokeBitrixSync('unbind_events'),
  });

  const searchCrm = useMutation({
    mutationFn: (phoneNumber: string) =>
      invokeBitrixSync('search_crm', { phone_number: phoneNumber }),
  });

  // Link a Bitrix24 installation (by domain) to this company
  const linkInstallation = useMutation({
    mutationFn: async (domain: string) => {
      if (!companyId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('bitrix-sync', {
        body: { action: 'link_installation', company_id: companyId, call_data: { domain } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bitrix-credentials', companyId] });
    },
  });

  // VoxImplant SIP line management
  const sipGetLines = useMutation({
    mutationFn: async () => {
      const data = await invokeBitrixSync('sip_get');
      return data?.result as any[];
    },
  });

  const sipAddLine = useMutation({
    mutationFn: (lineData: { type: string; title: string; server: string; login: string; password: string }) =>
      invokeBitrixSync('sip_add', lineData),
  });

  const sipDeleteLine = useMutation({
    mutationFn: (configId: number) =>
      invokeBitrixSync('sip_delete', { config_id: configId }),
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
    linkInstallation,
    sipGetLines,
    sipAddLine,
    sipDeleteLine,
  };
}

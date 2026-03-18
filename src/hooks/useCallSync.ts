import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

/**
 * Hook to manage call lifecycle with Bitrix24 sync.
 * - registerCall: registers a new call in Bitrix24 and creates a local call_log
 * - finishCall: finishes a call in Bitrix24 and updates the local call_log
 */
export function useCallSync() {
  const { currentCompany } = useCompany();

  const registerCall = useCallback(
    async (params: {
      phoneNumber: string;
      direction: 'inbound' | 'outbound';
      bitrixUserId?: string;
    }) => {
      if (!currentCompany?.id) return null;

      try {
        const { data, error } = await supabase.functions.invoke('bitrix-sync', {
          body: {
            action: 'register',
            company_id: currentCompany.id,
            call_data: {
              PHONE_NUMBER: params.phoneNumber,
              USER_ID: params.bitrixUserId || 1,
              TYPE: params.direction === 'outbound' ? 1 : 2,
              SHOW: 1,
              CRM_CREATE: 1,
              CALL_START_DATE: new Date().toISOString(),
            },
          },
        });

        if (error) throw error;

        const bitrixCallId = data?.result?.CALL_ID;
        return bitrixCallId || null;
      } catch (err) {
        console.error('Error registering call:', err);
        return null;
      }
    },
    [currentCompany?.id]
  );

  const finishCall = useCallback(
    async (params: {
      bitrixCallId: string;
      duration: number;
      statusCode: number; // 200=answered, 304=missed, 603=declined
      phoneNumber?: string;
    }) => {
      if (!currentCompany?.id) return;

      try {
        // Finish in Bitrix24
        await supabase.functions.invoke('bitrix-sync', {
          body: {
            action: 'finish',
            company_id: currentCompany.id,
            call_data: {
              CALL_ID: params.bitrixCallId,
              DURATION: params.duration,
              STATUS_CODE: params.statusCode,
            },
          },
        });

        // Update local call_log
        const status =
          params.statusCode === 200
            ? 'completed'
            : params.statusCode === 304
              ? 'missed'
              : 'failed';

        await supabase
          .from('call_logs')
          .update({
            status,
            duration_seconds: params.duration,
            call_ended_at: new Date().toISOString(),
          })
          .eq('bitrix_call_id', params.bitrixCallId);
      } catch (err) {
        console.error('Error finishing call:', err);
        toast.error('Erro ao finalizar chamada no Bitrix24');
      }
    },
    [currentCompany?.id]
  );

  return { registerCall, finishCall };
}

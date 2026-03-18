import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useSipAccounts } from '@/hooks/useSipAccounts';
import { useCallSync } from '@/hooks/useCallSync';
import { toast } from 'sonner';

interface ActiveCall {
  bitrixCallId: string;
  phoneNumber: string;
  startTime: number;
}

/**
 * Listens to new bitrix_events via Realtime, resolves the correct
 * SIP account from user mappings, auto-dials, and exposes finishCall.
 */
export function useBitrixRealtimeEvents() {
  const { currentCompany } = useCompany();
  const { sipAccounts, defaultAccount } = useSipAccounts(currentCompany?.id);
  const { finishCall } = useCallSync();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const sipAccountsRef = useRef(sipAccounts);
  const defaultAccountRef = useRef(defaultAccount);

  useEffect(() => {
    sipAccountsRef.current = sipAccounts;
    defaultAccountRef.current = defaultAccount;
  }, [sipAccounts, defaultAccount]);

  useEffect(() => {
    if (!currentCompany?.id) return;

    const channel = supabase
      .channel('bitrix-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bitrix_events',
          filter: `company_id=eq.${currentCompany.id}`,
        },
        async (payload) => {
          const event = payload.new as {
            id: string;
            event_type: string;
            phone_number: string | null;
            call_id: string | null;
            bitrix_user_id: string | null;
            status: string;
          };

          if (
            (event.event_type === 'ONEXTERNALCALLSTART' ||
              event.event_type === 'ONEXTERNALCALLBACKSTART') &&
            event.phone_number
          ) {
            // Try to find the SIP account mapped to this Bitrix user
            let account = defaultAccountRef.current;

            if (event.bitrix_user_id && sipAccountsRef.current) {
              try {
                const { data: mapping } = await supabase
                  .from('bitrix_user_mappings')
                  .select('sip_account_id')
                  .eq('company_id', currentCompany.id)
                  .eq('bitrix_user_id', event.bitrix_user_id)
                  .maybeSingle();

                if (mapping?.sip_account_id) {
                  const mapped = sipAccountsRef.current.find(
                    (a) => a.id === mapping.sip_account_id
                  );
                  if (mapped) account = mapped;
                }
              } catch (err) {
                console.error('Error resolving user mapping:', err);
              }
            }

            if (!account) {
              toast.error('Chamada recebida do Bitrix24 mas nenhuma conta SIP configurada.');
              return;
            }

            const domain = account.sip_domain || account.sip_server;
            const sipUri = `sip:${event.phone_number}@${domain}`;

            // Track active call for finish
            setActiveCall({
              bitrixCallId: event.call_id || '',
              phoneNumber: event.phone_number,
              startTime: Date.now(),
            });

            toast.info(`Discando para ${event.phone_number}...`, {
              description: `Via ${account.display_name}`,
              duration: 5000,
            });

            window.location.href = sipUri;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id]);

  const handleFinishCall = useCallback(
    async (statusCode: number = 200) => {
      if (!activeCall?.bitrixCallId) return;

      const duration = Math.floor((Date.now() - activeCall.startTime) / 1000);
      await finishCall({
        bitrixCallId: activeCall.bitrixCallId,
        duration,
        statusCode,
        phoneNumber: activeCall.phoneNumber,
      });

      setActiveCall(null);
    },
    [activeCall, finishCall]
  );

  return { activeCall, finishCall: handleFinishCall };
}

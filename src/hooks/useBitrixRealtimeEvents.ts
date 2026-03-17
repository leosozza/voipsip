import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useSipAccounts } from '@/hooks/useSipAccounts';
import { toast } from 'sonner';

/**
 * Listens to new bitrix_events via Realtime and auto-dials
 * when OnExternalCallStart arrives with a phone number.
 */
export function useBitrixRealtimeEvents() {
  const { currentCompany } = useCompany();
  const { defaultAccount } = useSipAccounts(currentCompany?.id);
  const defaultAccountRef = useRef(defaultAccount);

  // Keep ref in sync so the callback always has the latest account
  useEffect(() => {
    defaultAccountRef.current = defaultAccount;
  }, [defaultAccount]);

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
        (payload) => {
          const event = payload.new as {
            id: string;
            event_type: string;
            phone_number: string | null;
            call_id: string | null;
            bitrix_user_id: string | null;
            status: string;
          };

          if (
            event.event_type === 'ONEXTERNALCALLSTART' &&
            event.phone_number
          ) {
            const account = defaultAccountRef.current;
            if (!account) {
              toast.error('Chamada recebida do Bitrix24 mas nenhuma conta SIP configurada.');
              return;
            }

            const domain = account.sip_domain || account.sip_server;
            const sipUri = `sip:${event.phone_number}@${domain}`;

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
}

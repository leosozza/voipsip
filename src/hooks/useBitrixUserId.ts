import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';

/**
 * Resolves the current authenticated user's Bitrix24 user ID
 * by looking up their SIP account assignment in bitrix_user_mappings.
 */
export function useBitrixUserId() {
  const { user } = useAuth();
  const { currentCompany } = useCompany();

  const { data: bitrixUserId } = useQuery({
    queryKey: ['bitrix-user-id', currentCompany?.id, user?.id],
    queryFn: async () => {
      if (!currentCompany?.id || !user?.id) return null;

      // Find the user's SIP account via extensions or sip_accounts
      // Then match it to a bitrix_user_mapping
      const { data: mappings } = await supabase
        .from('bitrix_user_mappings')
        .select('bitrix_user_id, sip_account_id')
        .eq('company_id', currentCompany.id)
        .not('sip_account_id', 'is', null);

      if (!mappings?.length) return null;

      // Check if the user has a default SIP account assigned
      const { data: defaultSip } = await supabase
        .from('sip_accounts')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('is_default', true)
        .maybeSingle();

      if (defaultSip) {
        const match = mappings.find(m => m.sip_account_id === defaultSip.id);
        if (match) return match.bitrix_user_id;
      }

      // Fallback: return first mapped user
      return mappings[0]?.bitrix_user_id ?? null;
    },
    enabled: !!currentCompany?.id && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return bitrixUserId ?? undefined;
}

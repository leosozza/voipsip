import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Company } from '@/types/voip';

export function useCompany() {
  const queryClient = useQueryClient();

  const { data: currentCompany, isLoading } = useQuery({
    queryKey: ['current-company'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) return null;

      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', membership.company_id)
        .maybeSingle();

      if (error) throw error;
      if (company) {
        return { ...company, role: membership.role } as Company & { role: string };
      }
      return null;
    },
  });

  const createCompany = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ name })
        .select()
        .single();

      if (companyError) throw companyError;

      const { error: memberError } = await supabase
        .from('company_members')
        .insert({ company_id: company.id, user_id: user.id, role: 'admin' });

      if (memberError) throw memberError;

      return company as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-company'] });
    },
  });

  return { currentCompany, isLoading, createCompany };
}

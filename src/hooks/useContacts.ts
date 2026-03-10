import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Contact } from '@/types/voip';

export function useContacts(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as unknown as Contact[];
    },
    enabled: !!companyId,
  });

  const addContact = useMutation({
    mutationFn: async (contact: { name: string; phone: string; email?: string; company_name?: string; notes?: string }) => {
      if (!companyId) throw new Error('Company not found');
      const { error } = await supabase.from('contacts').insert({ company_id: companyId, ...contact } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts', companyId] }); },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const { error } = await supabase.from('contacts').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts', companyId] }); },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts', companyId] }); },
  });

  return { contacts: contacts ?? [], isLoading, addContact, updateContact, deleteContact };
}

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Users, Phone, Link2, Unlink, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSipAccounts } from '@/hooks/useSipAccounts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Props {
  companyId: string;
}

interface BitrixUser {
  ID: string;
  NAME: string;
  LAST_NAME: string;
  EMAIL: string;
  WORK_POSITION?: string;
  PERSONAL_PHONE?: string;
  UF_PHONE_INNER?: string;
}

interface UserMapping {
  id: string;
  company_id: string;
  bitrix_user_id: string;
  bitrix_user_name: string | null;
  sip_account_id: string | null;
  inner_number: string | null;
  is_queue_member: boolean;
}

export function BitrixUserMappings({ companyId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sipAccounts } = useSipAccounts(companyId);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [bitrixUsers, setBitrixUsers] = useState<BitrixUser[]>([]);

  // Fetch saved mappings
  const { data: mappings = [], isLoading: mappingsLoading } = useQuery({
    queryKey: ['bitrix-user-mappings', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bitrix_user_mappings')
        .select('*')
        .eq('company_id', companyId)
        .order('bitrix_user_name');
      if (error) throw error;
      return data as UserMapping[];
    },
  });

  const fetchBitrixUsers = async () => {
    setLoadingUsers(true);
    try {
      let allUsers: BitrixUser[] = [];
      let start = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('bitrix-sync', {
          body: { action: 'get_users', company_id: companyId, call_data: { start } },
        });
        if (error) throw error;
        if (data?.result) {
          allUsers = [...allUsers, ...data.result];
          if (data.next) {
            start = data.next;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      setBitrixUsers(allUsers);

      // Auto-save new users to mappings table
      for (const user of allUsers) {
        const existing = mappings.find(m => m.bitrix_user_id === user.ID);
        if (!existing) {
          await supabase.from('bitrix_user_mappings').upsert({
            company_id: companyId,
            bitrix_user_id: user.ID,
            bitrix_user_name: `${user.NAME} ${user.LAST_NAME}`.trim(),
            inner_number: user.UF_PHONE_INNER || null,
          }, { onConflict: 'company_id,bitrix_user_id' });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['bitrix-user-mappings', companyId] });
      toast({ title: `${allUsers.length} usuários carregados do Bitrix24` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const updateMapping = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UserMapping> & { id: string }) => {
      const { error } = await supabase
        .from('bitrix_user_mappings')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bitrix-user-mappings', companyId] });
    },
  });

  const handleAssignSip = async (mappingId: string, sipAccountId: string | null) => {
    try {
      await updateMapping.mutateAsync({
        id: mappingId,
        sip_account_id: sipAccountId === 'none' ? null : sipAccountId,
      });
      toast({ title: sipAccountId && sipAccountId !== 'none' ? 'Ramal atribuído' : 'Ramal removido' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleQueue = async (mappingId: string, isQueueMember: boolean) => {
    try {
      await updateMapping.mutateAsync({ id: mappingId, is_queue_member: isQueueMember });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleActivatePhone = async (bitrixUserId: string, activate: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('bitrix-sync', {
        body: {
          action: activate ? 'voximplant_user_activate_phone' : 'voximplant_user_deactivate_phone',
          company_id: companyId,
          call_data: { user_id: parseInt(bitrixUserId) },
        },
      });
      if (error) throw error;
      toast({ title: activate ? 'SIP ativado no Bitrix24' : 'SIP desativado no Bitrix24' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const assignedCount = mappings.filter(m => m.sip_account_id).length;
  const queueCount = mappings.filter(m => m.is_queue_member).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mapeamento de Usuários
              </CardTitle>
              <CardDescription>
                Vincule usuários do Bitrix24 a ramais SIP e configure filas de atendimento
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={fetchBitrixUsers} disabled={loadingUsers}>
              {loadingUsers ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
              Buscar Usuários
            </Button>
          </div>
          {mappings.length > 0 && (
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{mappings.length} usuários</Badge>
              <Badge variant="default">{assignedCount} com ramal</Badge>
              <Badge variant="outline">{queueCount} na fila</Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {mappingsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum usuário carregado.</p>
              <p className="text-xs mt-1">Clique em "Buscar Usuários" para importar do Bitrix24.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="flex items-center justify-between rounded-lg border p-3 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {mapping.bitrix_user_name || `Usuário ${mapping.bitrix_user_id}`}
                      </span>
                      {mapping.inner_number && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          Ramal {mapping.inner_number}
                        </Badge>
                      )}
                      {mapping.sip_account_id && (
                        <Badge variant="default" className="text-xs shrink-0">
                          <Link2 className="h-3 w-3 mr-1" />
                          Vinculado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">ID: {mapping.bitrix_user_id}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* SIP Account selector */}
                    <Select
                      value={mapping.sip_account_id || 'none'}
                      onValueChange={(value) => handleAssignSip(mapping.id, value)}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="Sem ramal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem ramal</SelectItem>
                        {sipAccounts.map((sip) => (
                          <SelectItem key={sip.id} value={sip.id}>
                            {sip.display_name} ({sip.sip_username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Queue toggle */}
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">Fila</Label>
                      <Switch
                        checked={mapping.is_queue_member}
                        onCheckedChange={(checked) => handleToggleQueue(mapping.id, checked)}
                      />
                    </div>

                    {/* Activate/Deactivate SIP in Bitrix */}
                    {mapping.sip_account_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8"
                        onClick={() => handleActivatePhone(mapping.bitrix_user_id, true)}
                        title="Ativar SIP no Bitrix24"
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

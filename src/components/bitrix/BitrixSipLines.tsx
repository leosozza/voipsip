import { useState } from 'react';
import { Server, Loader2, Trash2, Upload, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useBitrixCredentials } from '@/hooks/useBitrixCredentials';
import type { SipAccount } from '@/types/voip';

interface Props {
  companyId: string;
  sipAccounts: SipAccount[];
}

interface SipLine {
  CONFIG_ID: number;
  TYPE: string;
  TITLE: string;
  SERVER: string;
  LOGIN: string;
  REG_ID?: number;
  PHONE_NAME?: string;
}

export function BitrixSipLines({ companyId, sipAccounts }: Props) {
  const { isConnected, isExpired, isRefreshing, sipGetLines, sipAddLine, sipDeleteLine } = useBitrixCredentials(companyId);
  const [lines, setLines] = useState<SipLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { toast } = useToast();

  if (!isConnected || isExpired) return null;

  const onLoadLines = async () => {
    try {
      const result = await sipGetLines.mutateAsync();
      setLines(result || []);
      setLoaded(true);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar linhas SIP', description: err.message, variant: 'destructive' });
    }
  };

  const onRegister = async (acc: SipAccount) => {
    setLoadingId(acc.id);
    try {
      await sipAddLine.mutateAsync({
        type: 'cloud',
        title: acc.display_name,
        server: acc.sip_server,
        login: acc.sip_username,
        password: acc.sip_password,
      });
      toast({ title: 'Linha SIP registrada no Bitrix24', description: acc.display_name });
      onLoadLines();
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingId(null);
    }
  };

  const onDelete = async (configId: number) => {
    try {
      await sipDeleteLine.mutateAsync(configId);
      toast({ title: 'Linha removida do Bitrix24' });
      onLoadLines();
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5" />
              Linhas SIP no Bitrix24
            </CardTitle>
            <CardDescription>
              Registre seus ramais SIP como linhas VoxImplant no portal Bitrix24
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={onLoadLines} disabled={sipGetLines.isPending}>
            {sipGetLines.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            Carregar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Local SIP accounts with register button */}
        {sipAccounts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Contas locais</p>
            {sipAccounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <span className="text-sm font-medium">{acc.display_name}</span>
                  <p className="text-xs text-muted-foreground">{acc.sip_username}@{acc.sip_server}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRegister(acc)}
                  disabled={loadingId === acc.id}
                >
                  {loadingId === acc.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                  Registrar no Bitrix
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Lines registered in Bitrix24 */}
        {loaded && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Linhas no Bitrix24</p>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma linha SIP registrada no portal.</p>
            ) : (
              lines.map(line => (
                <div key={line.CONFIG_ID} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{line.TITLE}</span>
                      <Badge variant="outline" className="text-xs">{line.TYPE}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{line.LOGIN}@{line.SERVER}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(line.CONFIG_ID)} disabled={sipDeleteLine.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

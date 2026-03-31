import { useCallLogs } from '@/hooks/useCallLogs';
import { useSipAccounts } from '@/hooks/useSipAccounts';
import { useBitrixCredentials } from '@/hooks/useBitrixCredentials';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { CallsChart } from '@/components/dashboard/CallsChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Wifi, WifiOff, Link2, Link2Off, Loader2 } from 'lucide-react';

interface Props {
  companyId: string;
}

export function BitrixDashboardTab({ companyId }: Props) {
  const { callLogs, metrics, isLoading } = useCallLogs(companyId);
  const { sipAccounts, defaultAccount, isLoading: sipLoading } = useSipAccounts(companyId);
  const { isConnected, isExpired, isRefreshing } = useBitrixCredentials(companyId);

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* SIP Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contas SIP
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sipLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : sipAccounts.length === 0 ? (
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Nenhuma conta SIP configurada</span>
              </div>
            ) : (
              <div className="space-y-2">
                {sipAccounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium">{acc.display_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        {acc.sip_username}@{acc.sip_domain || acc.sip_server}
                      </Badge>
                      {acc.is_default && (
                        <Badge variant="default" className="text-xs">Padrão</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bitrix Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isConnected && !isExpired ? (
                <Link2 className="h-4 w-4" />
              ) : (
                <Link2Off className="h-4 w-4" />
              )}
              Bitrix24
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isRefreshing ? (
                <>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Renovando...
                  </Badge>
                  <span className="text-sm text-muted-foreground">Atualizando token</span>
                </>
              ) : isConnected && !isExpired ? (
                <>
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">Conectado</Badge>
                  <span className="text-sm text-muted-foreground">Integração ativa</span>
                </>
              ) : isExpired ? (
                <>
                  <Badge variant="destructive">Token expirado</Badge>
                  <span className="text-sm text-muted-foreground">Reconexão necessária</span>
                </>
              ) : (
                <>
                  <Badge variant="secondary">Desconectado</Badge>
                  <span className="text-sm text-muted-foreground">Configure na aba Configurações</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <MetricsCards metrics={metrics} isLoading={isLoading} />
      <CallsChart callLogs={callLogs} isLoading={isLoading} />
    </div>
  );
}

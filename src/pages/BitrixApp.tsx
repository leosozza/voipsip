import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, LayoutDashboard, Phone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brand } from '@/components/layout/Brand';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { CallsView } from '@/components/calls/CallsView';
import { useLiveEvents } from '@/hooks/useLiveEvents';
import { useStatus } from '@/hooks/useStatus';
import { api } from '@/lib/api';
import { initBX24 } from '@/lib/bitrix-context';
import { queryKeys } from '@/lib/query-keys';

/**
 * Compact view rendered by Bitrix24 inside its app iframe (no sidebar, no softphone:
 * the desktop window owns the phone). Hands the portal auth to the local server.
 */
export default function BitrixApp() {
  const queryClient = useQueryClient();
  const { data: status } = useStatus();
  const [warning, setWarning] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useLiveEvents();

  useEffect(() => {
    let cancelled = false;
    initBX24()
      .then(async (auth) => {
        if (!auth) return;
        await api.sendIframeAuth({
          access_token: auth.access_token,
          refresh_token: auth.refresh_token,
          expires_in: auth.expires_in,
          domain: auth.domain,
          member_id: auth.member_id,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.status });
      })
      .catch((err: Error) => {
        if (!cancelled) setWarning(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  // Keep the Bitrix24 frame as tall as the content.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => window.BX24?.fitWindow());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="mx-auto max-w-[1100px] space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Brand />
        {status?.bitrix.domain && (
          <p className="text-sm text-muted-foreground">
            {status.bitrix.domain}
            {status.bitrix.userName && ` · ${status.bitrix.userName}`}
          </p>
        )}
      </header>

      {warning && (
        <Alert className="py-2">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="text-xs">Não foi possível sincronizar o acesso com o Bitrix24: {warning}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Painel
          </TabsTrigger>
          <TabsTrigger value="calls" className="gap-1.5">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Chamadas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <DashboardView />
        </TabsContent>
        <TabsContent value="calls" className="mt-4">
          <CallsView limit={200} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

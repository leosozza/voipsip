import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface MicroSipStatusProps {
  companyId: string;
}

export function MicroSipStatus({ companyId }: MicroSipStatusProps) {
  const [status, setStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [extension, setExtension] = useState<string | null>(null);

  useEffect(() => {
    async function getInitialStatus() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: ext } = await supabase
        .from('extensions')
        .select('status, extension_number')
        .eq('company_id', companyId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (ext) {
        setStatus(ext.status as any || 'offline');
        setExtension(ext.extension_number);
      } else {
        setStatus('offline');
      }
    }

    getInitialStatus();

    // Subscribe to status changes
    const channel = supabase
      .channel('extension-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'extensions',
        },
        (payload) => {
          const updated = payload.new as any;
          // Check if this update is for the current company
          if (updated.company_id === companyId) {
            // Further narrowed by initial getInitialStatus setup
            getInitialStatus();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, extension]);

  if (status === 'loading') {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={status === 'online' ? 'default' : 'secondary'} className="gap-1.5 transition-all">
        {status === 'online' ? (
          <>
            <Wifi className="h-3 w-3 text-green-400" />
            MicroSip Online {extension && `(${extension})`}
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-muted-foreground" />
            MicroSip Offline
          </>
        )}
      </Badge>
    </div>
  );
}

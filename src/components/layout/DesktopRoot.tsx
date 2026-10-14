import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LoadingScreen } from '@/components/common/ScreenStates';
import { PhoneProvider } from '@/components/phone/PhoneProvider';
import { SoftphoneWidget } from '@/components/phone/SoftphoneWidget';
import { queryKeys } from '@/lib/query-keys';
import type { SetupLocationState } from '@/lib/setup-route';

/**
 * Bitrix24 sends the browser back to /?connected=1 or /?connect_error=<msg> at the end
 * of the OAuth flow. Both continue in the setup wizard.
 */
function useOAuthReturn(): boolean {
  const { search } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(search);
  const error = params.get('connect_error');
  const connected = params.get('connected') === '1';

  useEffect(() => {
    if (error) {
      toast.error('Não foi possível conectar ao Bitrix24', { description: error });
      navigate('/setup', { replace: true, state: { step: 2, error } satisfies SetupLocationState });
    } else if (connected) {
      toast.success('Bitrix24 conectado com sucesso');
      void queryClient.invalidateQueries({ queryKey: queryKeys.status });
      navigate('/setup', { replace: true, state: { step: 3 } satisfies SetupLocationState });
    }
  }, [error, connected, navigate, queryClient]);

  return !!error || connected;
}

/** Root of the desktop window: one softphone + live events for every page. */
export function DesktopRoot() {
  const redirecting = useOAuthReturn();

  return (
    <PhoneProvider>
      <Suspense fallback={<LoadingScreen />}>{redirecting ? <LoadingScreen /> : <Outlet />}</Suspense>
      <SoftphoneWidget />
    </PhoneProvider>
  );
}

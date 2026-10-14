import { Suspense } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { Activity, BookOpen, LayoutDashboard, Phone, Settings, type LucideIcon } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { ConnectionStatus } from '@/components/layout/ConnectionStatus';
import { LoadingScreen, ServerUnavailable } from '@/components/common/ScreenStates';
import { useStatus } from '@/hooks/useStatus';
import { cn } from '@/lib/utils';

const NAV: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/calls', label: 'Chamadas', icon: Phone },
  { to: '/settings', label: 'Configurações', icon: Settings },
  { to: '/guide', label: 'Guia', icon: BookOpen },
  { to: '/logs', label: 'Diagnóstico', icon: Activity },
];

/** Desktop shell: sidebar + status bar. Sends the user to /setup while Bitrix24 is not connected. */
export function AppShell() {
  const { data: status, isLoading, error, refetch } = useStatus();

  if (isLoading) return <LoadingScreen />;
  if (!status) return <ServerUnavailable error={error} onRetry={() => void refetch()} />;
  if (!status.bitrix.connected) return <Navigate to="/setup" replace />;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center border-b px-4 text-sidebar-foreground">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 p-2" aria-label="Navegação principal">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  isActive
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="border-t px-4 py-3 text-xs text-muted-foreground">v{status.version}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-14 items-center gap-4 px-4 md:px-6">
            <span className="md:hidden">
              <Brand />
            </span>
            <div className="hidden min-w-0 md:block">
              <ConnectionStatus status={status} />
            </div>
          </div>
          <div className="border-t px-4 py-2 md:hidden">
            <ConnectionStatus status={status} />
          </div>
        </header>

        <main className="flex-1 p-4 pb-28 md:p-6 md:pb-28">
          <div className="mx-auto max-w-6xl">
            <Suspense fallback={<LoadingScreen />}>
              <Outlet />
            </Suspense>
          </div>
        </main>

        <nav className="sticky bottom-0 z-30 flex border-t bg-background md:hidden" aria-label="Navegação principal">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn('flex flex-1 flex-col items-center gap-1 py-2 text-[11px]', isActive ? 'font-medium text-primary' : 'text-muted-foreground')
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Phone, Users, Settings, LogOut, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useBitrixRealtimeEvents } from '@/hooks/useBitrixRealtimeEvents';
import { useBitrixUserId } from '@/hooks/useBitrixUserId';
import { useSipAccounts } from '@/hooks/useSipAccounts';
import { Softphone } from '@/components/softphone/Softphone';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/calls', label: 'Chamadas', icon: Phone },
  { path: '/contacts', label: 'Contatos', icon: Users },
  { path: '/settings', label: 'Configurações', icon: Settings },
  { path: '/guide/microsip', label: 'Guia MicroSIP', icon: BookOpen },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { currentCompany } = useCompany();
  useBitrixRealtimeEvents();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r bg-sidebar-background md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Phone className="mr-2 h-5 w-5 text-primary" />
          <span className="font-bold text-sidebar-foreground">MicroSip Connector</span>
        </div>
        {currentCompany && (
          <div className="border-b px-4 py-2">
            <p className="text-xs text-muted-foreground">Empresa</p>
            <p className="text-sm font-medium truncate">{currentCompany.name}</p>
          </div>
        )}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}>
                <Icon className="h-4 w-4" />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-2">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">{user?.email}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sair</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b px-4 md:hidden">
          <Phone className="mr-2 h-5 w-5 text-primary" />
          <span className="font-bold">MicroSip Connector</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        <nav className="flex border-t bg-background md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
                isActive ? 'text-primary font-medium' : 'text-muted-foreground'
              )}>
                <Icon className="h-5 w-5" />{item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

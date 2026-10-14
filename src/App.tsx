import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LoadingScreen } from '@/components/common/ScreenStates';
import { AppShell } from '@/components/layout/AppShell';

// Route-level code splitting: the Bitrix24 iframe never downloads the softphone (sip.js).
const DesktopRoot = lazy(() => import('@/components/layout/DesktopRoot').then((m) => ({ default: m.DesktopRoot })));
const BitrixApp = lazy(() => import('@/pages/BitrixApp'));
const Calls = lazy(() => import('@/pages/Calls'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Guide = lazy(() => import('@/pages/Guide'));
const Logs = lazy(() => import('@/pages/Logs'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Settings = lazy(() => import('@/pages/Settings'));
const Setup = lazy(() => import('@/pages/Setup'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 2_000 } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={200}>
      <Toaster position="top-right" closeButton />
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Shown by Bitrix24 inside its iframe: compact, no softphone. */}
            <Route path="/bitrix/app" element={<BitrixApp />} />

            <Route element={<DesktopRoot />}>
              <Route path="/setup" element={<Setup />} />
              <Route element={<AppShell />}>
                <Route index element={<Dashboard />} />
                <Route path="/calls" element={<Calls />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<Guide />} />
                <Route path="/logs" element={<Logs />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

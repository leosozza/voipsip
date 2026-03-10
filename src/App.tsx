import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "@/components/auth/AuthForm";
import Dashboard from "./pages/Dashboard";
import Calls from "./pages/Calls";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import BitrixCallback from "./pages/BitrixCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calls" element={<Calls />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/bitrix/callback" element={<BitrixCallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return <ProtectedApp />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

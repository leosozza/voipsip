import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, LogIn, Building2, LayoutDashboard, Phone, Settings, BookOpen, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { resolveBitrixContext, companyNameFromDomain } from '@/lib/bitrix-context';
import { useToast } from '@/hooks/use-toast';
import { BitrixDashboardTab } from '@/components/bitrix/BitrixDashboardTab';
import { BitrixCallsTab } from '@/components/bitrix/BitrixCallsTab';
import { BitrixSettingsTab } from '@/components/bitrix/BitrixSettingsTab';
import { BitrixGuideTab } from '@/components/bitrix/BitrixGuideTab';
import { useBitrixRealtimeEvents } from '@/hooks/useBitrixRealtimeEvents';

type Step = 'loading' | 'no-context' | 'auth' | 'create-company' | 'linked';

export default function BitrixApp() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>('loading');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [domain, setDomain] = useState('');
  const [memberId, setMemberId] = useState('');

  // Auth form
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Company form
  const [companyName, setCompanyName] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);

  // Realtime listener for Bitrix events (Click-to-Call)
  useBitrixRealtimeEvents();

  const { toast } = useToast();

  const defaultTab = searchParams.get('tab') || 'dashboard';

  const ensureMembership = async (userId: string, targetCompanyId: string) => {
    const { data: existing } = await supabase
      .from('company_members')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', targetCompanyId)
      .maybeSingle();

    if (!existing) {
      // Check if company has no members — if so, add as admin
      const { data: hasNoMembers } = await supabase.rpc('company_has_no_members', { p_company_id: targetCompanyId });
      const role = hasNoMembers ? 'admin' : 'admin'; // all iframe users get admin for now
      await supabase
        .from('company_members')
        .insert({ company_id: targetCompanyId, user_id: userId, role });
    }
  };

  const tryLinkInstallation = async (userId: string) => {
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (membership?.company_id) {
      if (memberId) {
        await supabase
          .from('bitrix_installations')
          .update({ company_id: membership.company_id })
          .eq('member_id', memberId);
      }
      setCompanyId(membership.company_id);
      setStep('linked');
      return;
    }

    // Auto-create company from domain name
    const derivedName = domain ? companyNameFromDomain(domain) : '';
    if (derivedName) {
      try {
        const { data: newCompanyId, error } = await supabase
          .rpc('create_company_with_admin', { p_name: derivedName });
        if (error) throw error;

        if (memberId) {
          await supabase
            .from('bitrix_installations')
            .update({ company_id: newCompanyId })
            .eq('member_id', memberId);
        }
        setCompanyId(newCompanyId);
        setStep('linked');
        toast({ title: `Empresa "${derivedName}" criada automaticamente!` });
        return;
      } catch (err: any) {
        console.error('Auto-create company failed:', err);
        setCompanyName(derivedName);
        // Fall through to manual form
      }
    } else {
      // Pre-fill with domain-derived name even if empty derivation
      const fallbackName = domain ? domain.split('.')[0] : '';
      setCompanyName(fallbackName);
    }

    setStep('create-company');
  };

  useEffect(() => {
    async function init() {
      const ctx = await resolveBitrixContext(searchParams);
      setDomain(ctx.domain);
      setMemberId(ctx.memberId);

      if (!ctx.memberId && !ctx.domain) {
        setStep('no-context');
        return;
      }

      try {
        let data: any = null;
        if (ctx.memberId) {
          const res = await supabase
            .from('bitrix_installations')
            .select('company_id')
            .eq('member_id', ctx.memberId)
            .maybeSingle();
          data = res.data;
        }
        if (!data && ctx.domain) {
          const res = await supabase
            .from('bitrix_installations')
            .select('company_id')
            .eq('domain', ctx.domain)
            .maybeSingle();
          data = res.data;
        }

        if (data?.company_id) {
          // Check if user is authenticated — RLS on sip_accounts etc. requires auth
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setCompanyId(data.company_id);
            setStep('linked');
            return;
          } else {
            // Save company_id for after login, but require auth first
            setCompanyId(data.company_id);
            setStep('auth');
            return;
          }
        }
      } catch {
        // ignore
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await tryLinkInstallation(session.user.id);
      } else {
        setStep('auth');
      }
    }

    init();
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: 'Conta criada!', description: 'Verifique seu email para confirmar.' });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          // If companyId already resolved from installation, just go to linked
          if (companyId) {
            setStep('linked');
          } else {
            await tryLinkInstallation(data.user.id);
          }
        }
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Não autenticado');

      const { data: newCompanyId, error: rpcError } = await supabase
        .rpc('create_company_with_admin', { p_name: companyName });
      if (rpcError) throw rpcError;

      const company = { id: newCompanyId };

      if (memberId) {
        await supabase
          .from('bitrix_installations')
          .update({ company_id: company.id })
          .eq('member_id', memberId);
      }

      setCompanyId(company.id);
      setStep('linked');
      toast({ title: 'Empresa criada e portal vinculado!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setCompanyLoading(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'no-context') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              Este aplicativo deve ser acessado através do Bitrix24.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'auth') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              {authMode === 'signin' ? 'Entrar' : 'Criar conta'}
            </CardTitle>
            <CardDescription>
              Para vincular o portal{domain ? ` ${domain}` : ''}, faça login ou crie uma conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" disabled={authLoading} className="w-full">
                {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {authMode === 'signin' ? 'Entrar' : 'Criar conta'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {authMode === 'signin' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
                <button type="button" className="text-primary underline" onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}>
                  {authMode === 'signin' ? 'Criar conta' : 'Entrar'}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'create-company') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Criar empresa
            </CardTitle>
            <CardDescription>
              Crie uma empresa para vincular ao portal{domain ? ` ${domain}` : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da empresa</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Minha Empresa" />
              </div>
              <Button type="submit" disabled={companyLoading || !companyName} className="w-full">
                {companyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar e vincular
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step: linked — full tabbed app
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">
          MicroSip Connector{domain ? ` — ${domain}` : ''}
        </h1>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="border-b px-4">
          <TabsList className="h-auto bg-transparent p-0 gap-0">
            <TabsTrigger value="dashboard" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="calls" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 gap-2">
              <Phone className="h-4 w-4" />
              Chamadas
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="guide" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 gap-2">
              <BookOpen className="h-4 w-4" />
              Guia
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-4">
          <TabsContent value="dashboard" className="mt-0">
            {companyId && <BitrixDashboardTab companyId={companyId} />}
          </TabsContent>
          <TabsContent value="calls" className="mt-0">
            {companyId && <BitrixCallsTab companyId={companyId} />}
          </TabsContent>
          <TabsContent value="settings" className="mt-0">
            {companyId && <BitrixSettingsTab companyId={companyId} />}
          </TabsContent>
          <TabsContent value="guide" className="mt-0">
            {companyId && <BitrixGuideTab companyId={companyId} />}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

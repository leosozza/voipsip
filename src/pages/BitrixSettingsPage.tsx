import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, LogIn, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BitrixSettings } from '@/components/settings/BitrixSettings';
import { resolveBitrixContext } from '@/lib/bitrix-context';
import { useToast } from '@/hooks/use-toast';

type Step = 'loading' | 'no-context' | 'auth' | 'create-company' | 'linked';

export default function BitrixSettingsPage() {
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

  const { toast } = useToast();

  // Try to link installation to a company for the current user
  const tryLinkInstallation = async (userId: string) => {
    // Check if user has a company
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (membership?.company_id) {
      // Link installation
      if (memberId) {
        await supabase
          .from('bitrix_installations')
          .update({ company_id: membership.company_id })
          .eq('member_id', memberId);
      }
      setCompanyId(membership.company_id);
      setStep('linked');
    } else {
      setStep('create-company');
    }
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

      // Check if installation already has a company
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
          setCompanyId(data.company_id);
          setStep('linked');
          return;
        }
      } catch {
        // ignore
      }

      // Not linked — check if user is already authenticated
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
          await tryLinkInstallation(data.user.id);
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

      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ name: companyName })
        .select('id')
        .single();
      if (companyError) throw companyError;

      // Add user as admin
      const { error: memberError } = await supabase
        .from('company_members')
        .insert({ company_id: company.id, user_id: session.user.id, role: 'admin' });
      if (memberError) throw memberError;

      // Link installation
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        {step === 'linked' && (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.location.href = `/bitrix/app?DOMAIN=${encodeURIComponent(domain)}&member_id=${encodeURIComponent(memberId)}`;
                }}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>
              <h1 className="text-lg font-semibold">Configurações{domain ? ` - ${domain}` : ''}</h1>
            </div>
            {companyId && <BitrixSettings companyId={companyId} />}
          </>
        )}

        {step === 'no-context' && (
          <Card>
            <CardHeader>
              <CardTitle>Contexto não encontrado</CardTitle>
              <CardDescription>
                Não foi possível identificar o portal Bitrix24. Abra esta página a partir do aplicativo no Bitrix24.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {step === 'auth' && (
          <Card>
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
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  >
                    {authMode === 'signin' ? 'Criar conta' : 'Entrar'}
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'create-company' && (
          <Card>
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
        )}
      </div>
    </div>
  );
}

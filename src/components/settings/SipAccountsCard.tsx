import { useState } from 'react';
import { Globe, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusDot, ToneBadge } from '@/components/common/Status';
import { SipAccountForm } from '@/components/sip/SipAccountForm';
import { pickDefaultAccount, useSipAccountMutations, useSipAccounts } from '@/hooks/useSipAccounts';
import { usePhone } from '@/hooks/usePhone';
import type { SipAccount } from '@/lib/api';
import { REGISTRATION } from '@/lib/format';

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

type Editing = { kind: 'new' } | { kind: 'edit'; account: SipAccount } | null;

export function SipAccountsCard() {
  const { data: accounts, isLoading } = useSipAccounts();
  const { create, update, remove } = useSipAccountMutations();
  const { state, enabled } = usePhone();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<SipAccount | null>(null);
  const active = pickDefaultAccount(accounts);

  const onError = (title: string) => (err: unknown) => toast.error(title, { description: errorMessage(err) });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" aria-hidden="true" />
            Contas SIP (WebRTC)
          </CardTitle>
          <CardDescription>Usadas pelo softphone embutido. A conta padrão é registrada automaticamente.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing({ kind: 'new' })}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Nova conta
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !accounts?.length ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma conta SIP cadastrada.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {accounts.map((account) => {
              const isActive = account.id === active?.id;
              const reg = REGISTRATION[state.registration];
              return (
                <li key={account.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {account.display_name}
                      {account.is_default === 1 && <ToneBadge tone="info">Padrão</ToneBadge>}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {account.sip_username}@{account.sip_domain || account.sip_server} · wss://{account.sip_server}:{account.ws_port}
                      {account.ws_path}
                    </p>
                    {isActive && enabled && (
                      <p className="flex items-center gap-1.5 text-xs">
                        <StatusDot tone={reg.tone} />
                        {reg.label}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {account.is_default !== 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: account.id, input: { is_default: true } }, { onError: onError('Falha ao definir conta padrão') })}
                      >
                        <Star className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Tornar padrão
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label={`Editar ${account.display_name}`} onClick={() => setEditing({ kind: 'edit', account })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Excluir ${account.display_name}`}
                      onClick={() => setDeleting(account)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.kind === 'edit' ? 'Editar conta SIP' : 'Nova conta SIP'}</DialogTitle>
            <DialogDescription>O PABX precisa aceitar SIP sobre WebSocket seguro (WSS).</DialogDescription>
          </DialogHeader>
          {editing && (
            <SipAccountForm
              key={editing.kind === 'edit' ? editing.account.id : 'new'}
              initial={editing.kind === 'edit' ? editing.account : null}
              submitLabel={editing.kind === 'edit' ? 'Salvar alterações' : 'Adicionar conta'}
              pending={create.isPending || update.isPending}
              onCancel={() => setEditing(null)}
              onSubmit={(fields) => {
                const done = { onSuccess: () => setEditing(null), onError: onError('Não foi possível salvar a conta') };
                if (editing.kind === 'edit') update.mutate({ id: editing.account.id, input: fields }, done);
                else create.mutate({ ...fields, is_default: !accounts?.length }, done);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a conta “{deleting?.display_name}”?</AlertDialogTitle>
            <AlertDialogDescription>O softphone deixará de usar esta conta. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={() => deleting && remove.mutate(deleting.id, { onError: onError('Não foi possível excluir a conta') })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

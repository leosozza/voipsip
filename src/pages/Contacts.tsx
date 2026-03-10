import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Trash2, Pencil, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCompany } from '@/hooks/useCompany';
import { useContacts } from '@/hooks/useContacts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const contactSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  phone: z.string().min(1, 'Telefone obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  company_name: z.string().optional(),
  notes: z.string().optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function Contacts() {
  const { currentCompany } = useCompany();
  const { contacts, isLoading, addContact, deleteContact } = useContacts(currentCompany?.id);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', phone: '', email: '', company_name: '', notes: '' },
  });

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const onSubmit = async (data: ContactForm) => {
    try {
      await addContact.mutateAsync(data);
      toast({ title: 'Contato adicionado!' });
      reset();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContact.mutateAsync(id);
      toast({ title: 'Contato removido' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Contatos</h2>
            <p className="text-muted-foreground">{contacts.length} contatos</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contatos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Novo Contato</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Contato</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input {...register('name')} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone *</Label>
                    <Input {...register('phone')} />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input {...register('email')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input {...register('company_name')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Input {...register('notes')} />
                  </div>
                  <Button type="submit" className="w-full" disabled={addContact.isPending}>
                    Salvar Contato
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">{search ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}</p>
            <p className="text-sm text-muted-foreground">
              {search ? 'Tente uma busca diferente.' : 'Adicione contatos para começar.'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell className="font-mono">{contact.phone}</TableCell>
                    <TableCell>{contact.email || '-'}</TableCell>
                    <TableCell>{contact.company_name || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

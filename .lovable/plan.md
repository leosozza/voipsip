

## Corrigir iframe do Bitrix mostrando dados zerados

### Causa raiz
Quando o usuário faz login no iframe do Bitrix24, o `companyId` é resolvido corretamente da tabela `bitrix_installations` (`cca4cf26` = "Dr Atende"). Porém, o `handleAuth` apenas faz `setStep('linked')` sem verificar se o usuário logado é membro dessa empresa. Se o usuário autenticou pela primeira vez no iframe (contexto de storage diferente), ele pode não estar vinculado como membro da empresa. Como resultado, todas as queries protegidas por RLS (`sip_accounts`, `bitrix_credentials`, `call_logs`) retornam vazio.

### Solução
Alterar `handleAuth` em `BitrixApp.tsx` para, quando `companyId` já estiver resolvido da instalação:

1. Verificar se o usuário logado já é membro da empresa (`company_members`)
2. Se não for, adicionar como membro (admin se a empresa não tem membros, ou member)
3. Só então ir para `setStep('linked')`

### Alterações

**`src/pages/BitrixApp.tsx`** -- Modificar `handleAuth`:
```typescript
// Após login bem-sucedido, se companyId já resolvido:
if (companyId) {
  // Verificar se já é membro
  const { data: existing } = await supabase
    .from('company_members')
    .select('id')
    .eq('user_id', data.user.id)
    .eq('company_id', companyId)
    .maybeSingle();
  
  if (!existing) {
    // Adicionar como membro da empresa da instalação
    await supabase
      .from('company_members')
      .insert({ company_id: companyId, user_id: data.user.id, role: 'admin' });
  }
  setStep('linked');
}
```

Tambem alterar o `init` para, quando o usuario ja esta autenticado e `company_id` existe na instalacao, verificar e vincular o membro antes de ir para `linked`.

### Arquivos modificados
- `src/pages/BitrixApp.tsx`


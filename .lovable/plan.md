
Diagnóstico (feito agora)
- Reproduzi o fluxo em `/bitrix/app?domain=dratende.bitrix24.com&member_id=...`.
- Ao clicar em “Criar e vincular”, a requisição `POST /rest/v1/companies?select=id` retorna `403` com: `new row violates row-level security policy for table "companies"`.

Causa raiz
- O insert de empresa está usando `.insert(...).select('id').single()`.
- Isso exige leitura da linha recém-criada (RETURNING/SELECT), mas a policy de SELECT em `companies` só permite membros da empresa (`is_company_member(id)`).
- No momento exato da criação, o usuário ainda não é membro, então a leitura falha e o fluxo quebra.

Plano de correção
1) Criar função de backend transacional para criação de empresa
- Nova função SQL `public.create_company_with_admin(p_name text)` com `SECURITY DEFINER`.
- Passos internos: valida `auth.uid()`, cria empresa, cria `company_members` com `role='admin'`, retorna `company_id`.
- `GRANT EXECUTE` apenas para `authenticated`.

2) Atualizar fluxo de criação no Bitrix iframe
- Arquivo: `src/pages/BitrixApp.tsx`
- Substituir insert direto em `companies` + insert em `company_members` por `supabase.rpc('create_company_with_admin', { p_name: companyName })`.
- Manter vínculo da instalação (`bitrix_installations.company_id`) após receber `company_id` retornado.

3) Atualizar fluxo de criação na tela Settings
- Arquivo: `src/hooks/useCompany.ts`
- Mesmo ajuste: usar RPC em `createCompany` (elimina erro idêntico fora do Bitrix iframe).

4) Melhorar tratamento de erro para diagnóstico rápido
- Em ambos fluxos, exibir mensagem mais específica quando falhar (empresa vs vínculo do portal), para evitar erro genérico.

Detalhes técnicos
- Não vamos afrouxar policy de SELECT de `companies` (evita exposição indevida).
- A correção evita empresa órfã e garante atomicidade.
- Mantém o modelo multi-tenant e RLS sem abrir exceções perigosas.

Validação após implementação
- Teste 1 (E2E): criar empresa pelo `/bitrix/app` com portal dratende; esperado: sem 403, entra em `linked`.
- Teste 2 (DB): confirmar 1 linha em `companies`, 1 linha em `company_members` (admin do usuário atual) e `bitrix_installations.company_id` preenchido.
- Teste 3 (E2E): criar empresa pela página `/settings` e confirmar que o erro de RLS não ocorre.

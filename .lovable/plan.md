

## Plano: Vincular empresa diretamente pelo iframe do Bitrix24

### Problema
O portal `thoth24.bitrix24.com` está instalado (`bitrix_installations` com `member_id`) mas `company_id` é `null`. A tela de configurações dentro do iframe mostra "Empresa não vinculada" sem nenhuma ação útil. Não existem empresas cadastradas ainda no sistema.

### Solução
Adicionar um fluxo de **login/cadastro + criação de empresa** diretamente na página `BitrixSettingsPage`, permitindo que o usuário resolva tudo sem sair do iframe do Bitrix24.

### Alterações

**1. `src/pages/BitrixSettingsPage.tsx`** — Quando `companyId` for `null`:
- Mostrar formulário de login/cadastro (email + senha) inline
- Após autenticar, verificar se o usuário já tem empresa (`company_members`)
- Se sim: vincular automaticamente a instalação (`bitrix_installations.company_id = empresa.id`) e mostrar `BitrixSettings`
- Se não: mostrar formulário para criar empresa, depois vincular automaticamente

**2. Lógica de vinculação automática:**
- Após identificar `companyId` do usuário logado, fazer `UPDATE bitrix_installations SET company_id = ? WHERE member_id = ?`
- Atualizar o estado local para renderizar `BitrixSettings`

**3. RLS:** A tabela `bitrix_installations` já permite updates via anon/authenticated? Verificar e ajustar se necessário com uma migration para permitir que usuários autenticados atualizem o `company_id` de instalações não vinculadas.

### Fluxo do usuário
1. Abre configurações no iframe → vê "Empresa não vinculada"
2. Faz login ou cadastro no formulário inline
3. Se já tem empresa → vincula automaticamente → mostra configurações
4. Se não tem empresa → cria uma → vincula → mostra configurações


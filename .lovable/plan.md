

## Criação automática de empresa na instalação

### Objetivo
Quando o usuário se autentica no iframe Bitrix e não possui empresa, criar automaticamente uma empresa com nome derivado do domínio (ex: `dratende.bitrix24.com.br` → `dr atende`), eliminando o passo manual "Criar empresa".

### Mudanças

**1. Função utilitária para derivar nome do domínio** (`src/lib/bitrix-context.ts`)
- Nova função `companyNameFromDomain(domain: string): string`
- Extrai o subdomínio antes de `.bitrix24`, aplica heurística de separação por camelCase/palavras comuns (ex: `dratende` → `dr atende`, `minhaempresa` → `minhaempresa`)
- Fallback: usa o subdomínio cru se não conseguir separar

**2. Auto-criar empresa em `tryLinkInstallation`** (`src/pages/BitrixApp.tsx`)
- Quando o usuário autenticado não tem empresa (onde hoje vai para `create-company`), chamar automaticamente `supabase.rpc('create_company_with_admin', { p_name: derivedName })`
- Vincular a instalação Bitrix ao `company_id` retornado
- Ir direto para `step = 'linked'` sem mostrar formulário
- Manter o formulário `create-company` como fallback apenas se a criação automática falhar

**3. Empresa editável depois** (já suportado)
- A policy `Admins can update their company` já permite que admins alterem o nome via Settings — nenhuma mudança necessária

### Lógica de extração do nome
```text
"dratende.bitrix24.com.br"  → subdomínio "dratende"  → "dr atende"
"minhaempresa.bitrix24.com" → subdomínio "minhaempresa" → "minhaempresa"  
"acme-corp.bitrix24.com"    → subdomínio "acme-corp" → "acme corp"
```
- Remove `.bitrix24.*`
- Substitui `-` e `_` por espaços
- Resultado é capitalizado (title case)

### Arquivos modificados
- `src/lib/bitrix-context.ts` — adicionar `companyNameFromDomain()`
- `src/pages/BitrixApp.tsx` — auto-criar empresa em `tryLinkInstallation`, remover redirecionamento para `create-company` no fluxo principal




# Plano: URLs de Registro do Aplicativo Bitrix24

## Contexto
O Bitrix24 Marketplace exige 3 URLs ao registrar um aplicativo:
1. **Application URL** — carrega dentro do iframe do Bitrix24
2. **Application installer URL** — chamada durante a instalação do app no portal
3. **Application settings handler** — página de configurações do app

## O que falta
Atualmente o app não tem:
- Endpoint de instalação que recebe `PLACEMENT_OPTIONS`, `AUTH_ID`, `REFRESH_ID` do Bitrix24
- Página que funcione dentro do iframe do Bitrix24
- Handler de configurações

## URLs Propostas

```text
Application URL:          https://voipsip.lovable.app/bitrix/app
Application installer URL: https://tequeyzhsixypnvevuiu.supabase.co/functions/v1/bitrix-install
Application settings handler: https://voipsip.lovable.app/bitrix/settings
```

## Implementação

### 1. Criar Edge Function `bitrix-install`
Recebe o POST do Bitrix24 durante instalação com `code`, `domain`, `server_domain`, `member_id`. Troca o code por tokens OAuth e salva na tabela `bitrix_credentials`.

### 2. Criar página `/bitrix/app`
Página frontend que carrega dentro do iframe do Bitrix24. Detecta se está em iframe, lê parâmetros `DOMAIN` e `AUTH_ID` da query string, e mostra status do softphone/integração.

### 3. Criar página `/bitrix/settings`  
Página frontend carregada no iframe do Bitrix24 quando o usuário clica em "Configurações" do app. Mostra as configurações de linhas externas e eventos.

### 4. Atualizar rotas no `App.tsx`
Adicionar rotas `/bitrix/app` e `/bitrix/settings`.

### 5. Adicionar tabela `bitrix_installations`
Armazena `member_id`, `domain`, `company_id` para suportar múltiplos portais Bitrix24 instalando o app.

### Migração SQL
```sql
CREATE TABLE public.bitrix_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL UNIQUE,
  domain text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bitrix_installations ENABLE ROW LEVEL SECURITY;
```


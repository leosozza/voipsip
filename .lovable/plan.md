

# Plano: Enviar dados de chamadas e gravações para o Bitrix24

## Como funciona

Quando uma chamada termina (ou é registrada manualmente), o app envia automaticamente os dados para o Bitrix24 usando a API REST de telefonia:

1. `telephony.externalcall.register` — registra o início da chamada no Bitrix
2. `telephony.externalcall.finish` — finaliza com duração, status e URL da gravação

## O que será feito

### 1. Tabela de credenciais Bitrix24
- Criar tabela `bitrix_credentials` com `company_id`, `bitrix_domain`, `access_token`, `refresh_token`, `client_id`, `client_secret`, `expires_at`
- RLS: somente admin da empresa pode gerenciar

### 2. Edge Function `bitrix-sync`
- Recebe dados da chamada (call_log_id ou dados diretos)
- Renova o token OAuth automaticamente se expirado (usando refresh_token via `oauth.bitrix.info/oauth/token/`)
- Chama `telephony.externalcall.register` e `telephony.externalcall.finish` na API REST do Bitrix24
- Envia `recording_url` no campo `RECORD_URL` do finish
- Salva novo token no banco após refresh

### 3. Trigger automático (opcional)
- Trigger no banco: quando `call_logs` recebe INSERT com `status = 'completed'`, dispara a edge function via `pg_net`
- Alternativa: chamar a function direto do frontend após registro manual

### 4. Configuração no Settings
- Nova seção "Integração Bitrix24" na página de configurações
- Campos: domínio Bitrix, client_id, client_secret
- Botão "Autorizar" que inicia fluxo OAuth do Bitrix24
- Status da conexão (conectado/desconectado, token válido/expirado)

### 5. Sobre gravações
- Se o MicroSIP ou PBX gerar arquivos de gravação, o `recording_url` precisa ser uma URL pública acessível
- O Bitrix24 faz download da gravação a partir da URL enviada no `RECORD_URL`
- Opção: usar file storage do Lovable Cloud para upload de gravações e gerar URL pública

## Fluxo completo

```text
Chamada finalizada
       │
       ▼
  call_logs INSERT
       │
       ▼
  Edge Function bitrix-sync
       │
       ├─ Refresh token (se expirado)
       ├─ telephony.externalcall.register
       ├─ telephony.externalcall.finish
       │    └─ RECORD_URL (URL da gravação)
       └─ Salva resultado
```

## Pré-requisitos
- Aplicação registrada no marketplace do Bitrix24 (ou app local) com permissões `telephony` e `crm`
- As credenciais `BITRIX_CLIENT_ID` e `BITRIX_CLIENT_SECRET` já existem nos secrets do projeto


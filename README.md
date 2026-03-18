# MicroSip Connector para Bitrix24

Conector de telefonia que integra o MicroSip com o Bitrix24 CRM, permitindo Click-to-Call, registro automático de chamadas e identificação de contatos.

## Desenvolvedor

**Thoth24** - Parceiro Bitrix24  
Website: [thoth24.com.br](https://thoth24.com.br)

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Funcionalidades](#funcionalidades)
4. [Fluxo de Instalação](#fluxo-de-instalação)
5. [Fluxo de Chamadas](#fluxo-de-chamadas)
6. [Edge Functions](#edge-functions)
7. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
8. [Configuração no Marketplace](#configuração-no-marketplace)
9. [Tecnologias](#tecnologias)

---

## Visão Geral

Este conector permite que empresas utilizem o MicroSip diretamente integrado ao Bitrix24 CRM, sem necessidade do SIP nativo do Bitrix. O sistema é **multi-tenant**, permitindo que múltiplas empresas configurem suas próprias credenciais.

### Principais Benefícios

- **Click-to-Call**: Clique em qualquer número no Bitrix24 para iniciar chamada
- **Popup de Chamadas**: Chamadas recebidas exibem popup com dados do CRM
- **Registro Automático**: Todas as chamadas são registradas no histórico do contato
- **Gravações**: Links de gravação anexados automaticamente às atividades

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                           BITRIX24 CRM                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │ Click-to-   │  │   Popup     │  │    Histórico de Chamadas    │  │
│  │    Call     │  │  Inbound    │  │    (CRM Activities)         │  │
│  └──────┬──────┘  └──────▲──────┘  └──────────────▲──────────────┘  │
│         │                │                         │                 │
│         │ ONEXTERNALCALLSTART    telephony.externalcall.register    │
│         │                │         telephony.externalcall.finish     │
└─────────┼────────────────┼─────────────────────────┼─────────────────┘
          │                │                         │
          ▼                │                         │
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPABASE (Backend)                            │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ bitrix-events    │  │ bitrix-sync      │  │  bitrix-install  │   │
│  │  (Webhooks)      │  │ (Call Sync)      │  │  (Install/Config)│   │
│  └────────┬─────────┘  └────────▲─────────┘  └──────────────────┘   │
│           │                     │                                    │
│           │    ┌────────────────┴────────────────┐                  │
│           │    │         BANCO DE DADOS          │                  │
│           │    │  - companies                    │                  │
│           │    │  - bitrix_credentials            │                  │
│           │    │  - bitrix_installations          │                  │
│           │    │  - sip_accounts                  │                  │
│           │    │  - call_logs                    │                  │
│           │    │  - external_phone_lines         │                  │
│           │    └─────────────────────────────────┘                  │
│           │                                                          │
└───────────┼──────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           MICROSIP                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │   SIP       │  │  WebRTC     │  │       Configuração          │  │
│  │   Client    │  │  Softphone  │  │    (Contas SIP)             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Componentes Principais

| Componente | Descrição |
|------------|-----------|
| **Frontend React** | Interface de configuração embutida via iframe no Bitrix24 |
| **Edge Functions** | Processamento de webhooks e integração com APIs |
| **Banco de Dados** | Armazenamento de credenciais, mapeamentos e logs |
| **SDK Bitrix24** | Biblioteca JavaScript oficial para comunicação com o CRM |

---

## Funcionalidades

### 1. Click-to-Call (Chamadas de Saída)

Quando o usuário clica em um número no Bitrix24:

1. Bitrix24 dispara evento `ONEXTERNALCALLSTART` para nosso webhook
2. Webhook identifica o usuário e busca sua conta SIP
3. Chamada é originada via softphone MicroSip
4. Telefone do agente toca primeiro, depois conecta ao destino

### 2. Popup de Chamadas Recebidas

Quando uma chamada chega no ramal:

1. Evento de chamada recebido
2. Sistema identifica o ramal e busca usuário Bitrix correspondente
3. Chama `telephony.externalcall.register` com `SHOW=1`
4. Popup aparece no Bitrix24 com dados do contato

### 3. Registro de Chamadas

Ao término de cada chamada:

1. Evento de finalização recebido
2. Sistema calcula duração e status (atendida/perdida)
3. Chama `telephony.externalcall.finish` com dados da chamada
4. Link de gravação é anexado à atividade do CRM

### 4. Sincronização de Usuários

- Busca automática de usuários ativos do Bitrix24
- Extração de ramal a partir das configurações do telefone interno
- Mapeamento automático ramal ↔ usuário

---

## Fluxo de Instalação

```
┌──────────────────────────────────────────────────────────────────────┐
│  1. INSTALAÇÃO DO APP                                                 │
│                                                                       │
│  Usuário instala app via Marketplace Bitrix24                        │
│         │                                                             │
│         ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ bitrix-install                                              │     │
│  │  - Recebe ONAPPINSTALL com tokens OAuth                     │     │
│  │  - Salva instalação (domain, member_id, tokens)             │     │
│  │  - Exibe página de sucesso com BX24.installFinish()         │     │
│  └─────────────────────────────────────────────────────────────┘     │
│         │                                                             │
│         ▼                                                             │
│  Usuário é redirecionado para interface do app no iframe             │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  2. CONFIGURAÇÃO                                                      │
│                                                                       │
│  Usuário configura contas SIP e linhas externas                      │
│         │                                                             │
│         ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ Página de Settings (/bitrix/settings)                       │     │
│  │  - Vincula portal à empresa na plataforma                   │     │
│  │  - Configura contas SIP para softphone                      │     │
│  │  - Registra linhas externas no Bitrix24                     │     │
│  │  - Vincula eventos de telefonia                             │     │
│  └─────────────────────────────────────────────────────────────┘     │
│         │                                                             │
│         ▼                                                             │
│  Sistema pronto para uso!                                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Auto-Vinculação de Tenant

O sistema detecta automaticamente o `member_id` do portal Bitrix24 e vincula à empresa correspondente. Isso permite:

- Múltiplos usuários do mesmo portal compartilham a mesma configuração
- Não é necessário criar empresa manualmente
- Configurações persistem entre sessões

---

## Fluxo de Chamadas

### Chamada de Saída (Click-to-Call)

```
Bitrix24                    Backend                         MicroSip
   │                           │                               │
   │ 1. Click no número        │                               │
   │──────────────────────────►│                               │
   │   ONEXTERNALCALLSTART     │                               │
   │                           │ 2. Busca mapeamento           │
   │                           │    usuário → conta SIP        │
   │                           │                               │
   │                           │ 3. Origina chamada            │
   │                           │──────────────────────────────►│
   │                           │                               │
   │ 4. register (TYPE=1)      │                               │
   │◄──────────────────────────│                               │
   │   (Atualiza status)       │                               │
   │                           │                               │
   │                           │ 5. Chamada finalizada         │
   │                           │◄──────────────────────────────│
   │                           │                               │
   │ 6. finish                 │                               │
   │◄──────────────────────────│                               │
   │   (Registra no CRM)       │                               │
```

### Chamada Recebida (Inbound)

```
MicroSip                    Backend                         Bitrix24
   │                           │                               │
   │ 1. Chamada recebida       │                               │
   │──────────────────────────►│                               │
   │                           │ 2. Identifica ramal           │
   │                           │    Busca usuário Bitrix       │
   │                           │                               │
   │                           │ 3. register (SHOW=1, TYPE=2)  │
   │                           │──────────────────────────────►│
   │                           │                               │
   │                           │              4. Popup aparece │
   │                           │                  com CRM card │
   │                           │                               │
   │ 5. Chamada finalizada     │                               │
   │──────────────────────────►│                               │
   │                           │ 6. finish                     │
   │                           │──────────────────────────────►│
   │                           │                               │
   │                           │         7. Atividade criada   │
   │                           │            com gravação       │
```

---

## Edge Functions

| Função | Propósito | JWT |
|--------|-----------|-----|
| `bitrix-install` | Processa instalação do app (ONAPPINSTALL) | ❌ |
| `bitrix-sync` | Sincronização de chamadas com Bitrix24 | ❌ |
| `bitrix-events` | Recebe webhooks de eventos Bitrix24 | ❌ |
| `bitrix-oauth-callback` | Callback OAuth Bitrix24 | ❌ |
| `bitrix-client-id` | Retorna Client ID para OAuth | ❌ |

---

## Estrutura do Banco de Dados

### Tabelas

```sql
-- Empresas (tenants)
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Membros da empresa (usuários)
CREATE TABLE company_members (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  user_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ
);

-- Credenciais Bitrix24
CREATE TABLE bitrix_credentials (
  id UUID PRIMARY KEY,
  company_id UUID UNIQUE REFERENCES companies,
  bitrix_domain TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Instalações Bitrix24
CREATE TABLE bitrix_installations (
  id UUID PRIMARY KEY,
  member_id TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  company_id UUID REFERENCES companies,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Contas SIP
CREATE TABLE sip_accounts (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  display_name TEXT,
  sip_server TEXT NOT NULL,
  sip_username TEXT NOT NULL,
  sip_password TEXT NOT NULL,
  sip_domain TEXT,
  ws_port INTEGER,
  transport TEXT,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Linhas telefônicas externas
CREATE TABLE external_phone_lines (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  line_number TEXT NOT NULL,
  line_name TEXT,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Logs de chamadas
CREATE TABLE call_logs (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  external_line_id UUID REFERENCES external_phone_lines,
  direction TEXT,
  phone_number TEXT NOT NULL,
  status TEXT,
  duration_seconds INTEGER,
  recording_url TEXT,
  sip_call_id TEXT,
  caller_name TEXT,
  call_started_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);

-- Eventos Bitrix24
CREATE TABLE bitrix_events (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies,
  event_type TEXT NOT NULL,
  status TEXT,
  phone_number TEXT,
  bitrix_user_id TEXT,
  call_id TEXT,
  crm_entity_type TEXT,
  crm_entity_id TEXT,
  raw_data JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

---

## Configuração no Marketplace

### URLs de Configuração

Configure no Marketplace do Bitrix24:

| Campo | URL |
|-------|-----|
| **Initial install path** | `https://[SUPABASE_URL]/functions/v1/bitrix-install` |
| **Application URL** | `https://voipsip.lovable.app/bitrix/app` |
| **Settings path** | `https://voipsip.lovable.app/bitrix/settings` |

### Permissões Necessárias

- `telephony` - Gerenciamento de telefonia
- `crm` - Acesso ao CRM para registro de atividades
- `user` - Leitura de usuários para mapeamento

### Eventos de Telefonia

- `ONEXTERNALCALLSTART` - Click-to-Call
- `ONEXTERNALCALLBACKSTART` - Callback externo

---

## Tecnologias

### Frontend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.3 | Framework UI |
| TypeScript | 5.x | Tipagem estática |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Estilização |
| shadcn/ui | - | Componentes UI |
| React Query | 5.x | Cache e fetch |
| React Router | 6.x | Roteamento |
| sip.js | 0.21 | Softphone WebRTC |

### Backend

| Tecnologia | Uso |
|------------|-----|
| Supabase | Banco de dados PostgreSQL + Auth |
| Edge Functions (Deno) | Serverless functions |
| Row Level Security | Segurança multi-tenant |

### Integrações

| API | Documentação |
|-----|--------------|
| Bitrix24 REST API | [rest.bitrix24.com](https://training.bitrix24.com/rest_help/) |

---

## Estrutura de Diretórios

```
├── src/
│   ├── components/
│   │   ├── auth/           # Componentes de autenticação
│   │   ├── calls/          # Tabela de logs e click-to-call
│   │   ├── dashboard/      # Métricas e gráficos
│   │   ├── layout/         # Layout principal
│   │   ├── settings/       # Configurações Bitrix24
│   │   ├── softphone/      # Softphone WebRTC
│   │   └── ui/             # Componentes shadcn/ui
│   ├── hooks/              # Custom hooks
│   ├── integrations/
│   │   └── supabase/       # Cliente Supabase
│   ├── pages/              # Páginas da aplicação
│   └── types/              # Definições TypeScript
│
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── bitrix-install/
│   │   ├── bitrix-sync/
│   │   ├── bitrix-events/
│   │   ├── bitrix-client-id/
│   │   ├── bitrix-oauth-callback/
│   │   └── ...
│   └── config.toml         # Configuração Supabase
│
├── public/                 # Assets estáticos
└── index.html              # Entry point
```

---

## Licença

Proprietário - Thoth24

Este software é de propriedade exclusiva da Thoth24. Todos os direitos reservados.

---

## Suporte

Para suporte técnico, entre em contato com a Thoth24.

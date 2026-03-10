

# Plano: Aplicação de Telefonia VoIP com WebRTC

## Contexto

O projeto atual é uma integração Api4Com + Bitrix24. Vamos transformá-lo em uma **aplicação de telefonia VoIP independente** usando WebRTC + SIP.js, conectável a qualquer servidor SIP (incluindo tronco Vivo).

## Arquitetura

```text
┌─────────────────────────────────────┐
│          Frontend (React)           │
│  ┌──────────┐  ┌─────────────────┐  │
│  │ Softphone │  │   Dashboard     │  │
│  │ (SIP.js)  │  │   Chamadas      │  │
│  │  WebRTC   │  │   Contatos      │  │
│  └─────┬─────┘  └────────┬────────┘  │
│        │                  │          │
│        ▼                  ▼          │
│     WebSocket        Supabase DB    │
│     (SIP over WS)    (call_logs,    │
│        │              contacts,     │
│        │              sip_accounts) │
└────────┼─────────────────┼──────────┘
         │                 │
         ▼                 ▼
   ┌──────────┐     ┌──────────┐
   │ SIP/PBX  │     │ Lovable  │
   │ Server   │     │ Cloud    │
   │(Asterisk/│     │(Supabase)│
   │ FreePBX/ │     └──────────┘
   │ Vivo SIP)│
   └──────────┘
```

## O que será feito

### 1. Reestruturar o banco de dados
- **Remover** dependências de Api4Com e Bitrix24 das tabelas (manter `companies`, `company_members`, `call_logs`, `external_phone_lines`)
- **Criar** tabela `sip_accounts` (servidor SIP, porta, usuário, senha, domínio, transport ws/wss)
- **Criar** tabela `contacts` (nome, telefone, empresa, notas)
- **Adaptar** `call_logs` — remover `api4com_call_id` e `bitrix_call_id`, adicionar `sip_call_id`
- **Adaptar** `user_mappings` → `extensions` (ramal, nome, sip_account_id)

### 2. Remover código Bitrix24/Api4Com
- Remover `BitrixContext`, `useBitrix`, `useBitrixUsers`, tipos Bitrix24
- Remover edge functions específicas: `bitrix24-handler`, `bitrix24-install`, `bitrix24-webhook`, `api4com-setup`, `api4com-webhook`, `register-telephony-events`, `diagnose-telephony`, `register-external-line`, `check-user-phone`, `set-outgoing-line`, `retry-call-finish`, `sync-bitrix-users`
- Remover hooks: `useCredentials` (Api4Com-specific), setup wizard steps de Bitrix

### 3. Implementar autenticação própria
- Tela de login/cadastro com email + senha (Lovable Cloud auth)
- Proteção de rotas

### 4. Componente Softphone WebRTC (SIP.js)
- Instalar `sip.js` como dependência
- Componente `<Softphone>` com: discador numérico, botão ligar/desligar, status de registro SIP, indicador de chamada ativa, controles (mudo, hold, DTMF)
- Usar `UserAgent` do SIP.js para conectar via WebSocket ao servidor SIP
- Registrar chamadas no banco automaticamente

### 5. Novas páginas e UI
- **Dashboard**: métricas de chamadas (reutilizar `MetricsCards` e `CallsChart`)
- **Chamadas**: histórico completo (reutilizar `CallLogTable` adaptado)
- **Contatos**: CRUD de contatos com busca
- **Configurações**: configuração da conta SIP (servidor, credenciais, porta WS)
- **Softphone flutuante**: widget sempre visível para fazer/receber chamadas

### 6. Configuração SIP Setup
- Wizard simplificado: Empresa → Conta SIP (servidor, usuário, senha, domínio, porta WS) → Ramais
- Edge function `test-sip-connection` para validar credenciais

## Detalhes técnicos

- **SIP.js** será adicionado como dependência npm para WebRTC + SIP over WebSocket
- As credenciais SIP ficam criptografadas no banco (tabela `sip_accounts` com RLS por company)
- O áudio usa `<audio>` elements gerenciados pelo SIP.js UserAgent
- Chamadas de entrada são detectadas via evento `invite` do SIP.js
- Toda chamada gera registro automático em `call_logs`

## Fora do escopo inicial
- Gravação de chamadas (requer media server)
- Transferência de chamadas / conferência (fase 2)
- IVR / filas de atendimento (requer PBX)


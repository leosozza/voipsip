

# Plano: Suporte Multi-SIP com Seleção no Click-to-Call

## Resumo

Adicionar botões click-to-call (`sip:` URI) nos contatos e histórico de chamadas, com um seletor de conta SIP quando há mais de uma configurada. Remover o Softphone simulado (que não funciona sem WebSocket) e substituir por click-to-call real via MicroSIP.

## Mudanças

### 1. Criar componente `ClickToCall`
- Novo componente `src/components/calls/ClickToCall.tsx`
- Recebe `phoneNumber` como prop
- Usa `useSipAccounts` para listar contas SIP da empresa
- Se houver 1 conta: botão direto com `sip:number@server`
- Se houver 2+: dropdown para escolher qual conta usar
- Gera URI `sip:{number}@{sip_server}` e abre via `window.location.href`

### 2. Adicionar click-to-call na tabela de Contatos
- Na coluna de telefone em `Contacts.tsx`, adicionar o componente `ClickToCall` ao lado do número

### 3. Adicionar click-to-call na tabela de Chamadas
- Em `CallLogTable.tsx`, adicionar `ClickToCall` na coluna de número

### 4. Remover Softphone simulado
- Remover `<Softphone>` de `App.tsx` (não funciona sem WebSocket/proxy)
- Manter o arquivo por enquanto mas não renderizar

### 5. Atualizar Settings
- Manter o formulário multi-SIP existente como está (já suporta múltiplas contas)
- Adicionar indicador visual de qual conta é "padrão" com botão para trocar

## Arquivos afetados
- `src/components/calls/ClickToCall.tsx` (novo)
- `src/pages/Contacts.tsx` (adicionar click-to-call)
- `src/components/calls/CallLogTable.tsx` (adicionar click-to-call)
- `src/App.tsx` (remover Softphone)
- `src/pages/Settings.tsx` (botão "definir como padrão")


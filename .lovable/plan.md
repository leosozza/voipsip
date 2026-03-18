

## Plano: App completo dentro do iframe Bitrix24 + Gestão de linhas SIP via API VoxImplant

### Contexto
Hoje o iframe do Bitrix24 (`/bitrix/app`) mostra apenas status de instalação, e `/bitrix/settings` mostra só configurações de integração. O usuário quer que **Dashboard, Chamadas, Configurações e Guia** apareçam diretamente no iframe, além de poder registrar múltiplos ramais SIP no Bitrix24 via `voximplant.sip.add`, associando-os a agentes e filas.

### Parte 1 — Navegação completa dentro do iframe Bitrix24

**Transformar `BitrixApp` em um mini-app com abas/navegação interna** que inclui:
- **Dashboard** — métricas e gráfico de chamadas (reutiliza `MetricsCards`, `CallsChart`, `CallLogTable`)
- **Chamadas** — histórico filtrado (reutiliza lógica de `Calls.tsx`)
- **Configurações** — contas SIP + integração Bitrix (reutiliza `BitrixSettings` e formulário SIP de `Settings.tsx`)
- **Guia MicroSIP** — conteúdo do guia adaptado

**Implementação:**
- Criar componente `BitrixAppLayout` com tabs horizontais (usando `Tabs` do shadcn) em vez da sidebar lateral
- Cada tab renderiza o conteúdo correspondente, passando `companyId` obtido da instalação
- Manter autenticação inline (login/cadastro) quando `company_id` for `null`, igual ao fluxo já feito em `BitrixSettingsPage`
- Unificar a lógica de resolução de contexto + auth + company linking em um wrapper compartilhado

**Rotas:**
- `/bitrix/app` vira o ponto de entrada único com tabs internas (sem precisar de rotas separadas)
- `/bitrix/settings` pode redirecionar para `/bitrix/app?tab=settings`

### Parte 2 — Gestão de linhas SIP no Bitrix24 via VoxImplant API

**Nova seção em Configurações (dentro do iframe):** "Ramais SIP no Bitrix24"

Usar a API `voximplant.sip.*` para:
- **Listar** linhas SIP registradas: `voximplant.sip.get`
- **Adicionar** nova linha SIP: `voximplant.sip.add` (TYPE, TITLE, SERVER, LOGIN, PASSWORD)
- **Remover** linha SIP: `voximplant.sip.delete`
- **Atualizar** linha SIP: `voximplant.sip.update`

**Fluxo:** Cada conta SIP cadastrada no sistema (`sip_accounts`) pode ser "publicada" no Bitrix24 como uma linha SIP. O usuário clica "Registrar no Bitrix24" ao lado de cada conta SIP, e o sistema chama `voximplant.sip.add` passando os dados do servidor SIP.

**Implementação no Edge Function `bitrix-sync`:**
- Adicionar actions: `sip_add`, `sip_get`, `sip_delete`, `sip_update`
- Cada action chama o método REST correspondente do Bitrix24

**UI:**
- Na aba Configurações do iframe, nova card "Linhas SIP no Bitrix24"
- Lista as linhas já registradas (via `sip_get`)
- Botão para registrar cada conta SIP local como linha no portal
- Botão para remover linhas

### Parte 3 — Detalhes técnicos

**Arquivos modificados:**
1. `src/pages/BitrixApp.tsx` — reescrever como mini-app com tabs e autenticação inline
2. `src/pages/BitrixSettingsPage.tsx` — redirecionar para `/bitrix/app?tab=settings` ou manter como alias
3. `supabase/functions/bitrix-sync/index.ts` — adicionar actions `sip_add`, `sip_get`, `sip_delete`, `sip_update`
4. `src/hooks/useBitrixCredentials.ts` — adicionar mutations para `sip_*`
5. Novo componente `src/components/bitrix/BitrixSipLines.tsx` — UI para gestão de linhas SIP no Bitrix
6. `src/App.tsx` — simplificar rotas Bitrix (pode manter `/bitrix/settings` como redirect)

**Não requer migração de banco** — usa apenas APIs REST do Bitrix24 e tabelas existentes.


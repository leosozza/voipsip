

## Plano: Conformidade com Bitrix24 Marketplace + BX24.js SDK

### Contexto
A documentacao do Bitrix24 exige que apps no Marketplace usem o BX24.js SDK para comunicacao dentro do iframe, e que cenarios obrigatorios de telefonia estejam implementados. Atualmente faltam alguns itens criticos.

### Alteracoes

**1. config.toml -- verify_jwt = false para endpoints publicos**
Adicionar configuracao para `bitrix-install` e `bitrix-events` aceitarem requests sem JWT (requisicoes vem do Bitrix24, nao de usuarios autenticados):
```toml
[functions.bitrix-install]
verify_jwt = false

[functions.bitrix-events]
verify_jwt = false
```

**2. BitrixApp.tsx -- Integrar BX24.js SDK**
- Carregar o script `//api.bitrix24.com/api/v1/` dinamicamente
- Usar `BX24.init()` para inicializar o contexto do iframe
- Usar `BX24.fitWindow()` para ajustar o tamanho do frame automaticamente
- Obter `domain` e `member_id` via `BX24.getAuth()` como fallback (alem dos query params)

**3. BitrixSettingsPage.tsx -- Integrar BX24.js SDK**
- Mesma integracao com BX24.js: carregar script, `BX24.init()`, `BX24.fitWindow()`
- Obter contexto de autenticacao via SDK

**4. bitrix-events/index.ts -- Processar OnExternalCallStart com SHOW=1**
Apos salvar o evento, chamar `telephony.externalcall.register` com `SHOW=1` para exibir o card de chamada no CRM (requisito obrigatorio do Marketplace). Isso requer:
- Buscar tokens da empresa via `bitrix_credentials` ou `bitrix_installations`
- Chamar a API do Bitrix24 com o token para registrar a chamada
- Atualizar o status do evento para "processed"

**5. Checklist de conformidade Marketplace**
| Requisito | Status |
|---|---|
| Register incoming/outgoing calls | Implementado (bitrix-sync: register) |
| Pass incoming line number (Sales Intelligence) | Implementado (LINE_NUMBER param) |
| Attach call recording | Implementado (bitrix-sync: attach_record) |
| OnExternalCallStart handler (click2call) | Parcial -- falta SHOW=1 no processing |
| OnExternalCallBackStart handler | Implementado (event.bind) |
| BX24.installFinish() na instalacao | Implementado (bitrix-install) |
| BX24.js SDK nas paginas iframe | **Faltando** -- sera adicionado |

### Resumo das mudancas
- 1 arquivo de config (`supabase/config.toml`)
- 2 paginas frontend (`BitrixApp.tsx`, `BitrixSettingsPage.tsx`)
- 1 edge function (`bitrix-events/index.ts`)


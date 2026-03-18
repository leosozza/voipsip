
# Conformidade Bitrix24 Telephony - Plano de Implementação

## Status: CONCLUÍDO

### ✅ Fase 1: Corrigir bitrix-sync
- [x] Substituir `RECORD_URL` no finish por `telephony.externalCall.attachRecord` separado
- [x] Adicionar `CALL_START_DATE`, `USER_PHONE_INNER`, `CRM_SOURCE` no register
- [x] Adicionar action `add_external_line` / `delete_external_line` / `get_external_lines`
- [x] Adicionar action `search_crm` (searchCrmEntities)
- [x] Adicionar action `bind_events` / `unbind_events`
- [x] Adicionar action `show_call_card` / `hide_call_card`

### ✅ Fase 2: Eventos obrigatórios
- [x] Criar edge function `bitrix-events` para webhooks OnExternalCallStart / OnExternalCallBackStart
- [x] Criar tabela `bitrix_events` com realtime habilitado
- [x] RLS policies para a tabela
- [x] Processar OnExternalCallStart com SHOW=1 (telephony.externalcall.register)

### ✅ Fase 3: UI
- [x] Seção "Linhas Externas" nas configurações
- [x] Seção "Eventos Bitrix24" com bind/unbind
- [x] Hook atualizado com todas as novas mutations

### ✅ Fase 4: BX24.js SDK + Conformidade Marketplace
- [x] Integrar BX24.js SDK em BitrixApp.tsx (init, fitWindow, getAuth)
- [x] Integrar BX24.js SDK em BitrixSettingsPage.tsx
- [x] Configurar verify_jwt=false para bitrix-install e bitrix-events
- [x] OnExternalCallStart → register com SHOW=1

## Checklist Marketplace
| Requisito | Status |
|---|---|
| Register incoming/outgoing calls | ✅ |
| Pass incoming line number (Sales Intelligence) | ✅ |
| Attach call recording | ✅ |
| OnExternalCallStart handler (click2call + SHOW=1) | ✅ |
| OnExternalCallBackStart handler | ✅ |
| BX24.installFinish() na instalação | ✅ |
| BX24.js SDK nas páginas iframe | ✅ |

## Próximos passos
- Integrar eventos recebidos com o softphone (realtime subscription)
- Implementar flow completo de click-to-call (evento → discagem automática)

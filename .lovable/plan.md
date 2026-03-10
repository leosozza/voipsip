
# Conformidade Bitrix24 Telephony - Plano de Implementação

## Status: EM EXECUÇÃO

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

### ✅ Fase 3: UI
- [x] Seção "Linhas Externas" nas configurações
- [x] Seção "Eventos Bitrix24" com bind/unbind
- [x] Hook atualizado com todas as novas mutations

## Próximos passos
- Integrar eventos recebidos com o softphone (realtime subscription)
- Implementar flow completo de click-to-call (evento → discagem automática)

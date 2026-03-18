

## Plano: Sincronização automática de chamadas com Bitrix24 usando mapeamento de usuários

### Problema
Atualmente, quando o Bitrix24 dispara `ONEXTERNALCALLSTART`, o sistema registra a chamada no Bitrix mas não cria um registro local em `call_logs`, e não usa o mapeamento de `bitrix_user_mappings` para identificar qual ramal/conta SIP corresponde ao usuário. Também não há fluxo de finalização automática da chamada.

### Solução
Criar uma edge function dedicada (`bitrix-call-sync`) que atua como webhook de lifecycle completo de chamadas, e atualizar o `bitrix-events` para usar o mapeamento de usuários ao processar eventos.

### Alterações

**1. Atualizar `supabase/functions/bitrix-events/index.ts`**
- Ao receber `ONEXTERNALCALLSTART`, consultar `bitrix_user_mappings` para encontrar o `sip_account_id` correto baseado no `bitrix_user_id`
- Usar o `USER_ID` do mapeamento ao chamar `telephony.externalcall.register`
- Criar automaticamente um registro em `call_logs` com `direction`, `phone_number`, `status: 'ringing'`, `user_mapping_id` e `sip_call_id` (o CALL_ID retornado pelo Bitrix)
- Ao receber `ONEXTERNALCALLBACKSTART`, fazer o mesmo fluxo para chamadas de callback

**2. Criar nova edge function `supabase/functions/bitrix-call-finish/index.ts`**
- Endpoint que o frontend chama quando uma chamada termina (hangup no MicroSIP)
- Recebe: `company_id`, `call_id` (Bitrix CALL_ID), `duration`, `status_code`, `phone_number`
- Chama `telephony.externalcall.finish` no Bitrix24
- Atualiza o `call_logs` correspondente com `status: 'completed'`/`'missed'`, `duration_seconds`, `call_ended_at`

**3. Atualizar `src/hooks/useBitrixRealtimeEvents.ts`**
- Ao receber evento do Realtime, além de abrir o `sip:` URI, usar o mapeamento para encontrar a conta SIP correta do usuário logado (não apenas a default)
- Guardar o `call_id` do Bitrix em state para que o frontend possa finalizar a chamada depois
- Expor função `finishCall(callId, duration)` que chama `bitrix-sync` com action `finish` e atualiza `call_logs`

**4. Atualizar `src/components/softphone/Softphone.tsx` ou criar hook `useCallSync`**
- Novo hook `src/hooks/useCallSync.ts` que:
  - Ao iniciar chamada (click-to-call ou evento Bitrix), chama `bitrix-sync` action `register` com o `user_id` correto do mapeamento
  - Ao encerrar, chama action `finish` com duração e status
  - Cria/atualiza registros em `call_logs` automaticamente
  - Usa o `bitrix_user_mappings` para resolver `bitrix_user_id` ↔ `sip_account_id`

**5. Adicionar migration para índice e coluna**
- Adicionar coluna `bitrix_call_id` em `call_logs` para rastrear o CALL_ID do Bitrix
- Índice em `bitrix_user_mappings(company_id, bitrix_user_id)` para lookups rápidos

### Fluxo completo
```text
Bitrix24 Click-to-Call
  → webhook ONEXTERNALCALLSTART → bitrix-events
    → consulta bitrix_user_mappings (bitrix_user_id → sip_account_id)
    → telephony.externalcall.register (USER_ID correto)
    → INSERT call_logs (status=ringing, bitrix_call_id=CALL_ID)
    → Realtime → frontend abre sip: URI com conta SIP correta

Usuário desliga no MicroSIP
  → frontend chama useCallSync.finishCall()
    → bitrix-sync action=finish (CALL_ID, duration)
    → UPDATE call_logs (status=completed, duration, call_ended_at)
```

### Arquivos
1. `supabase/functions/bitrix-events/index.ts` — lookup de mapeamento + insert em call_logs
2. `src/hooks/useCallSync.ts` — novo hook para register/finish de chamadas
3. `src/hooks/useBitrixRealtimeEvents.ts` — usar mapeamento ao resolver conta SIP
4. Migration — adicionar `bitrix_call_id` em `call_logs`


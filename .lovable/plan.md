

# Analise: Conformidade com Requisitos Bitrix24 Telephony

## Requisitos Obrigatórios do Marketplace (5 itens)

Baseado na documentação oficial em `requirements-telephony.html`:

### 1. Register de chamadas (entrada/saída) -- PARCIAL
**Status:** Implementado parcialmente

O `bitrix-sync` já chama `telephony.externalcall.register`, mas com problemas:
- Usa `RECORD_URL` no `finish` (parâmetro **deprecated** segundo a documentação)
- Falta passar `CALL_START_DATE` em formato ISO 8601 com timezone
- Falta suporte a `USER_PHONE_INNER` (ramal interno) como alternativa ao `USER_ID`
- Falta suporte a `CRM_SOURCE` para identificar a origem

### 2. LINE_NUMBER obrigatório para Sales Intelligence -- PARCIAL
**Status:** Implementado parcialmente

O campo `LINE_NUMBER` é passado mas como string vazia por padrão. Para conformidade com Sales Intelligence, é necessário:
- Registrar linhas externas no Bitrix24 via `telephony.externalLine.add`
- Sempre enviar o número da linha real nas chamadas de entrada
- Criar uma action `add_external_line` no `bitrix-sync` para registrar linhas

### 3. Gravação via `telephony.externalCall.attachRecord` -- NAO IMPLEMENTADO
**Status:** Faltando

A documentação do Bitrix24 diz explicitamente que `RECORD_URL` no `finish` é **deprecated**. O método correto é:
1. Chamar `telephony.externalcall.finish` SEM gravação
2. Depois chamar `telephony.externalCall.attachRecord` com `CALL_ID`, `FILENAME` e `RECORD_URL` ou `FILE_CONTENT` (base64)

O código atual usa `RECORD_URL` no `finish`, que pode falhar silenciosamente.

### 4. Click-to-Call via evento `OnExternalCallStart` -- NAO IMPLEMENTADO
**Status:** Faltando

O Bitrix24 exige um handler para o evento `OnExternalCallStart`. Quando o usuário clica para ligar no CRM do Bitrix24, o evento é disparado e a integração deve:
- Receber o webhook com número e user_id
- Iniciar a chamada no softphone/PBX
- Não precisa chamar `register` novamente (já está registrado)

Necessário:
- Criar um endpoint/edge function para receber o webhook `OnExternalCallStart`
- Registrar o handler no Bitrix24 via `event.bind`

### 5. Callback CRM via evento `OnExternalCallBackStart` -- NAO IMPLEMENTADO
**Status:** Faltando

Quando um visitante preenche o formulário de callback do CRM, o Bitrix24 dispara `OnExternalCallBackStart`. A integração deve:
- Receber o webhook com `PHONE_NUMBER`, `TEXT`, `VOICE`, `CRM_ENTITY_TYPE/ID`
- Iniciar uma chamada de callback para o número informado

Necessário:
- Criar endpoint para receber o webhook
- Registrar o handler via `event.bind`

---

## Cenários Recomendados (não obrigatórios, mas valorizados)

### 6. Busca CRM + encaminhamento ao responsável -- NAO IMPLEMENTADO
- Usar `telephony.externalCall.searchCrmEntities` em chamadas de entrada para encontrar o cliente e redirecionar ao responsável

### 7. Show/Hide do call card -- NAO IMPLEMENTADO
- Usar `telephony.externalcall.show` e `telephony.externalcall.hide` durante transferências

---

## Plano de Implementação

### Fase 1: Corrigir o que existe (bitrix-sync)
1. **Substituir `RECORD_URL` no finish** por chamada separada `telephony.externalCall.attachRecord`
   - Adicionar action `attach_record` no `bitrix-sync`
   - Alterar `register_and_finish` para chamar `attachRecord` após `finish`
2. **Adicionar `CALL_START_DATE`** no register com timezone
3. **Adicionar action `add_external_line`** para registrar linhas via `telephony.externalLine.add`
4. **Adicionar action `search_crm`** para buscar entidades CRM por telefone

### Fase 2: Eventos obrigatórios (novos endpoints)
5. **Criar edge function `bitrix-events`** para receber webhooks do Bitrix24:
   - Handler para `OnExternalCallStart` (click-to-call do CRM)
   - Handler para `OnExternalCallBackStart` (callback de formulário)
6. **Criar action `bind_events`** no `bitrix-sync` para registrar os handlers via `event.bind`

### Fase 3: UI e integração
7. **Atualizar Settings** para mostrar status de linhas externas registradas
8. **Adicionar botão** para registrar linhas externas no Bitrix24
9. **Adicionar botão** para registrar event handlers (bind)

---

## Detalhes Técnicos

### attachRecord (substituindo RECORD_URL deprecated)

```text
Fluxo correto:
1. telephony.externalcall.register → CALL_ID
2. telephony.externalcall.finish (sem RECORD_URL)
3. telephony.externalCall.attachRecord com:
   - CALL_ID
   - FILENAME: "recording.mp3"
   - RECORD_URL: url da gravação
```

### bitrix-events endpoint

```text
POST /functions/v1/bitrix-events
Body (do Bitrix24):
  event: "ONEXTERNALCALLSTART" | "ONEXTERNALCALLBACKSTART"
  data[PHONE_NUMBER]: "..."
  data[USER_ID]: "..."
  ...

Ação:
  - Salvar evento pendente no banco ou notificar via realtime
  - Retornar 200 OK
```

### event.bind (registrar handlers)

```text
bitrix API: event.bind
Params:
  event: "OnExternalCallStart"
  handler: "https://<project-id>.supabase.co/functions/v1/bitrix-events"
```


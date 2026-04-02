

## Remover DDI 55 dos números antes de enviar ao MicroSIP

### Problema
O Bitrix24 envia números com DDI brasileiro (ex: `5515996045202`), mas o MicroSIP só disca corretamente sem o DDI (ex: `15996045202`).

### Solução
Criar uma função utilitária `stripBrazilDDI(phone)` que remove o prefixo `55` (ou `+55`) de números brasileiros, e aplicá-la nos 3 pontos onde o número é enviado ao MicroSIP via `sip:` URI:

1. **`src/lib/utils.ts`** — Adicionar função:
   ```ts
   export function stripBrazilDDI(phone: string): string {
     let n = phone.replace(/\D/g, '');
     if (n.startsWith('55') && n.length >= 12) {
       n = n.slice(2);
     }
     return n;
   }
   ```
   Lógica: se começa com `55` e tem 12+ dígitos (DDI + DDD + número), remove os 2 primeiros.

2. **`src/hooks/useBitrixRealtimeEvents.ts`** (linha 89) — Aplicar `stripBrazilDDI(event.phone_number)` no URI SIP.

3. **`src/components/calls/ClickToCall.tsx`** (linha 19) — Aplicar `stripBrazilDDI(phoneNumber)` no URI SIP.

4. **`src/components/softphone/Softphone.tsx`** (linha 81) — Aplicar `stripBrazilDDI(phoneNumber)` no URI SIP.

### Nota
O número original (com DDI) continua sendo usado para registro no Bitrix24 e nos call_logs — a remoção é apenas no momento de montar o URI `sip:` para o MicroSIP.

### Arquivos modificados
- `src/lib/utils.ts`
- `src/hooks/useBitrixRealtimeEvents.ts`
- `src/components/calls/ClickToCall.tsx`
- `src/components/softphone/Softphone.tsx`


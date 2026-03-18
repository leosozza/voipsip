
Diagnóstico confirmado
- Logs do `bitrix-install`: recebeu `member_id` e tokens, mas sem `DOMAIN`.
- A função hoje só salva se `domain && member_id`, então a instalação não é persistida.
- Consulta no banco retornou `bitrix_installations` vazio.
- Resultado: no iframe do Bitrix, o app cai no estado que exibe “Este aplicativo deve ser acessado através do Bitrix24.”

Plano de implementação

1) Corrigir persistência de instalação mesmo sem `DOMAIN` inicial
- Criar migration para permitir `domain` nulo em `bitrix_installations`.
- Ajustar `bitrix-install` para salvar sempre que houver `member_id` (com `domain` opcional).
- Ampliar extração de domínio no install: `auth.domain`, `DOMAIN/domain`, `PLACEMENT_OPTIONS` (quando vier), e `origin/referer` quando disponíveis.

2) Fortalecer resolução de contexto nas páginas iframe
- Em `BitrixApp.tsx` e `BitrixSettingsPage.tsx`, resolver contexto com fallback:
  - query params case-insensitive (`DOMAIN/domain`, `member_id/MEMBER_ID`);
  - `BX24.getAuth()` após `BX24.init`;
  - `BX24.getDomain()` como fallback adicional.
- Remover a dependência rígida de `member_id` para seguir fluxo:
  - buscar instalação por `member_id` quando existir;
  - fallback por `domain` quando `member_id` não vier.

3) Auto-correção de vínculo técnico na primeira abertura
- Se instalação existir sem `domain` e o iframe fornecer `domain`, atualizar o registro automaticamente.
- Se não existir instalação, mas houver contexto suficiente (ex.: `member_id`), criar/upsert automaticamente via endpoint público já existente para evitar estado falso de erro.

4) Ajustar estados de UI para diagnóstico real
- Trocar a mensagem atual por estados mais precisos:
  - “Instalação em processamento” para contexto parcial,
  - erro real apenas quando nenhum contexto Bitrix estiver disponível.
- Manter `BX24.fitWindow()` e inicialização sem regressão.

Detalhes técnicos
- Arquivos-alvo:
  - `supabase/migrations/*` (alterar nulabilidade de `bitrix_installations.domain`)
  - `supabase/functions/bitrix-install/index.ts`
  - `src/pages/BitrixApp.tsx`
  - `src/pages/BitrixSettingsPage.tsx`
  - (opcional) util compartilhado para resolver contexto Bitrix sem duplicação
- Critérios de aceite:
  1. Ao abrir dentro do Bitrix, a mensagem “deve ser acessado...” não aparece indevidamente.
  2. A instalação passa a ser registrada no banco no primeiro install.
  3. `/bitrix/app` e `/bitrix/settings` funcionam no iframe mesmo quando o domínio não vier no payload inicial.
  4. `fitWindow()` continua funcionando.

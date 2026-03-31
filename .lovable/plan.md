

## Renovação automática de tokens Bitrix24 no frontend

### Situação atual
- O backend (`bitrix-sync`) já renova tokens automaticamente quando uma ação é executada e o token está expirado
- O frontend verifica `expires_at` localmente e mostra "Token expirado", bloqueando cards de linhas externas, eventos e SIP lines
- O problema: o frontend bloqueia a UI antes de dar chance ao backend de renovar o token

### Solução
Adicionar uma mutation `refreshToken` no hook `useBitrixCredentials` que chama o backend com `action: 'test'` (que já faz refresh automático) e recarrega as credenciais. Usar essa mutation automaticamente quando `isExpired` é detectado.

### Mudanças

**1. `src/hooks/useBitrixCredentials.ts`**
- Adicionar mutation `refreshToken` que invoca `bitrix-sync` com `action: 'test'` e invalida o cache de credenciais
- Adicionar `useEffect` que dispara `refreshToken` automaticamente quando `isExpired === true` e `isConnected === true`
- Adicionar estado `isRefreshing` para que a UI mostre "Renovando token..." em vez de bloquear
- Exportar `isRefreshing` no retorno do hook

**2. `src/components/bitrix/BitrixDashboardTab.tsx`**
- Importar `isRefreshing` do hook
- No card de status Bitrix: quando `isRefreshing`, mostrar badge "Renovando..." com spinner em vez de "Token expirado"

**3. `src/components/bitrix/BitrixSettingsTab.tsx`**
- Importar `isRefreshing` do hook
- Tratar `isRefreshing` como "conectado" para não esconder os cards de linhas externas e eventos durante renovação

**4. `src/components/bitrix/BitrixSipLines.tsx`**
- Importar `isRefreshing` do hook
- Não retornar `null` durante renovação (mostrar loading state)

**5. `src/components/settings/BitrixSettings.tsx`**
- Importar `isRefreshing` e mostrar estado de renovação no badge de status

### Fluxo
```text
Token expirado detectado no frontend
  → useEffect dispara refreshToken (action: 'test')
  → Backend renova via oauth.bitrix.info
  → Backend atualiza DB com novo token
  → Frontend invalida query 'bitrix-credentials'
  → Novo expires_at carregado → isExpired = false
  → UI volta ao estado normal
```

### Arquivos modificados
- `src/hooks/useBitrixCredentials.ts`
- `src/components/bitrix/BitrixDashboardTab.tsx`
- `src/components/bitrix/BitrixSettingsTab.tsx`
- `src/components/bitrix/BitrixSipLines.tsx`
- `src/components/settings/BitrixSettings.tsx`


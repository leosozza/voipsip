

## Remover seções redundantes do iframe Bitrix

### Problema
No iframe do Bitrix (`BitrixSettingsTab`), estão aparecendo os cards "Integração Bitrix24" (OAuth manual) e "Vincular Portal Bitrix24", que são desnecessários porque a conexão é feita automaticamente durante a instalação via Marketplace.

### Solução
Remover o componente `<BitrixSettings>` do `BitrixSettingsTab` (iframe), mantendo-o apenas na página `/settings` (acesso direto fora do iframe). No iframe, manter apenas:
- Contas SIP
- Linhas externas (BitrixSipLines)
- Mapeamento de usuários (BitrixUserMappings)
- Cards de Linhas Externas e Eventos devem ser movidos para o `BitrixSettingsTab` diretamente (ou criar versão simplificada)

### Mudanças

**1. `src/components/bitrix/BitrixSettingsTab.tsx`**
- Remover import e renderização de `<BitrixSettings companyId={companyId} />`
- Adicionar os cards de Linhas Externas (Sales Intelligence) e Eventos Bitrix24 diretamente neste componente, usando os hooks `useBitrixCredentials` para as ações (bind/unbind events, load/add/delete lines)
- Manter separadores e organização visual

**2. `src/components/settings/BitrixSettings.tsx`** — sem alterações
- Continua sendo usado na página `/settings` para conexão manual fora do iframe

### Resultado
O iframe mostra apenas configurações operacionais (SIP, linhas, mapeamentos, eventos). A conexão OAuth fica restrita à página Settings standalone.


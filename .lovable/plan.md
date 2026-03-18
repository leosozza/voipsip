

## Plano: Renomear referências restantes e corrigir fluxo de instalação

### Problema
1. A tela de login na versão **publicada** ainda mostra "Api4Com" — o código-fonte já foi corrigido para "MicroSip Connector", mas a versão publicada precisa ser atualizada (clicar **Update** no publish dialog)
2. Existem referências "VoIP SIP" em 3 arquivos que também precisam ser renomeadas para "MicroSip Connector"
3. O README.md ainda referencia "Api4Com" extensivamente

### Alterações

**1. Renomear "VoIP SIP" → "MicroSip Connector" em:**
- `src/pages/BitrixApp.tsx` — título do card e texto de vinculação
- `src/pages/BitrixSettingsPage.tsx` — texto de instrução
- `supabase/functions/bitrix-install/index.ts` — título da página HTML, textos de instalação/sucesso

**2. Atualizar README.md** — substituir todas as referências de "Api4Com" por "MicroSip Connector" e atualizar a descrição da arquitetura

**3. Republicar o frontend** — após as alterações, será necessário clicar "Update" no botão Publish para que a versão publicada reflita as mudanças

### Nota sobre vinculação ao Bitrix
O fluxo de instalação (`bitrix-install`) já salva o `member_id` e `domain` na tabela `bitrix_installations`. A vinculação à empresa acontece na página de Settings do Bitrix (`/bitrix/settings`) quando o usuário faz login. Este fluxo já está implementado — as páginas iframe (`BitrixApp` e `BitrixSettingsPage`) já funcionam sem autenticação.


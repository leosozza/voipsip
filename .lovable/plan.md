

# Plano: Configurar Client ID do Bitrix24 no Frontend

## Problema
O código em `BitrixSettings.tsx` lê `import.meta.env.VITE_BITRIX_CLIENT_ID` para montar a URL OAuth, mas essa variável não existe no `.env`. Os secrets backend (`BITRIX_CLIENT_ID`, `BITRIX_CLIENT_SECRET`) já estão configurados, mas o Client ID precisa estar disponível no frontend.

## Solução
Como o Client ID do OAuth é uma chave pública (não é secret), ele pode ser armazenado diretamente no código ou como variável `VITE_`:

1. **Usuário fornece o Client ID** do Bitrix24
2. **Adicionar ao código** como constante em `BitrixSettings.tsx` ou como fallback, já que `VITE_` vars precisam estar no `.env` que é auto-gerenciado

### Alternativa mais robusta
Em vez de depender de `VITE_BITRIX_CLIENT_ID`, buscar o Client ID do backend via edge function, evitando hardcode no frontend.

## Aguardando
O valor do Client ID do usuário para prosseguir com a implementação.


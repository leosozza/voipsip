

## Plano: Tornar o guia MicroSIP genérico + campos em português

### Problema
O guia atual referencia a Vivo como exemplo fixo e usa nomes de campos em inglês, quando na verdade o conector funciona com **qualquer operadora SIP** conectada ao MicroSIP.

### Alterações em `src/pages/MicroSipGuide.tsx`

**1. Remover referências específicas à Vivo:**
- Linha 158: `"codecs necessários para o trunk da Vivo"` → `"codecs necessários para seu provedor SIP"`
- Linha 190: fallback `"ex: sip.vivo.com.br"` → `"ex: sip.seuprovedor.com.br"`
- Linha 338: `"Trunks da Vivo podem exigir IP fixo autorizado"` → `"Alguns provedores SIP exigem IP fixo autorizado"`

**2. Traduzir labels dos campos para português (conforme interface real do MicroSIP):**

| Atual (inglês) | Correto (português) |
|---|---|
| SIP Server | Servidor SIP |
| Username | Usuário |
| Password | Senha |
| Domain | Domínio |
| Transport | Transporte |

**3. Adicionar campos que faltam:**
- **Nome de Exibição** → `display_name` da conta
- **Proxy SIP** → mesmo que Servidor SIP (orientação)
- **Login** → mesmo que Usuário

Todas as alterações são no arquivo `src/pages/MicroSipGuide.tsx`, sem mudanças em backend ou banco.


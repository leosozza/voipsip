

## Plano: Atualizar guia MicroSIP com campos reais do screenshot

O screenshot mostra a tela real "Conta" do MicroSIP 3.22.3 em português. Os campos no guia precisam ser reordenados e complementados para corresponder exatamente à interface real.

### Alterações em `src/pages/MicroSipGuide.tsx`

**Reordenar e atualizar a lista de campos (linhas 189-197)** para seguir a ordem exata da tela:

| Ordem | Campo (real) | Valor sugerido |
|---|---|---|
| 1 | Nome da Conta | nome da operadora (ex: Syma) |
| 2 | Servidor SIP | `sip_server` |
| 3 | Proxy SIP | mesmo que Servidor SIP |
| 4 | Usuário | `sip_username` |
| 5 | Domínio | `sip_domain` ou `sip_server` |
| 6 | Login | mesmo que Usuário |
| 7 | Senha | •••••••• |
| 8 | Nome de Exibição | `display_name` |
| 9 | Criptografia | Desabilitado |
| 10 | Transporte | UDP |

**Também**: salvar o screenshot como imagem de referência no guia, substituindo a imagem atual (`microsip-config-example.png`).


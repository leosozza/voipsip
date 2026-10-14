# VoipSip Connector para Bitrix24

Conector de telefonia que liga o **MicroSIP** (ou um softphone WebRTC embutido) ao **Bitrix24**: clique para ligar a partir do CRM, popup de chamada recebida, registro automático das chamadas e upload das gravações.

Roda **localmente** no PC de cada atendente, sem servidor, sem banco na nuvem e sem mensalidade. Qualquer empresa que use Bitrix24 instala e configura em poucos minutos.

Desenvolvido por **[Thoth24](https://thoth24.com.br)**, parceiro Bitrix24.

---

## Como funciona

```
 Bitrix24 (nuvem)                         PC do atendente
┌──────────────────────┐                 ┌──────────────────────────────────────────┐
│ Clique num telefone  │  fila offline   │  VoipSip Connector (app na bandeja)       │
│ ONEXTERNALCALLSTART ─┼───────────────▶ │   • lê a fila (event.offline.*)          │
│                      │   (polling)     │   • servidor local http://localhost:5180 │
│ Popup / Histórico   ◀┼──── REST ────── │   • SQLite com histórico e configurações │
│ telephony.externalCall.register/finish │         │                    ▲            │
│ attachRecord (gravação)                │   discar│        eventos de  │chamada     │
└──────────────────────┘                 │         ▼        chamada (.vbs)            │
                                         │   MicroSIP  ─────────┘   ou WebRTC (sip.js)│
                                         └──────────────────────────────────────────┘
```

- **Saída (clique para ligar):** o Bitrix24 coloca o `ONEXTERNALCALLSTART` numa fila. O conector lê a fila, pega só os eventos do usuário daquele PC e disca no MicroSIP (`microsip.exe <número>`) ou no softphone embutido. A chamada já vem registrada pelo Bitrix24 (`CALL_ID`).
- **Entrada:** o MicroSIP executa um script a cada evento (`cmdIncomingCall`, `cmdCallAnswer`, `cmdCallEnd`…). O conector registra a chamada no Bitrix24 com popup do CRM e a finaliza com duração e status.
- **Gravações:** ao final da chamada, o arquivo `.mp3`/`.wav` é lido da pasta do MicroSIP e enviado em base64 com `telephony.externalCall.attachRecord`. Não é preciso PABX na nuvem nem webhook público.
- **Números BR:** o DDI 55 é removido na discagem (configurável), e o número original fica no Bitrix24.

Como o Bitrix24 não consegue chamar `localhost`, o conector usa [eventos offline](https://apidocs.bitrix24.com/api-reference/events/offline-events.html) em vez de webhooks. A autorização é feita por OAuth de um **aplicativo local** criado no próprio portal, e o redirecionamento volta para `http://localhost:5180`.

## Instalação (usuário final)

1. Baixe o instalador na página de [Releases](../../releases) (Windows `.exe`, macOS `.dmg`, Linux `.AppImage`) e instale.
2. No Bitrix24 (administrador): **Aplicativos → Recursos do desenvolvedor → Outros → Aplicativo local**
   - Tipo: **Servidor**
   - Caminho do seu manipulador: `http://localhost:5180/bitrix/app`
   - Caminho de instalação inicial: **vazio**
   - Permissões: **Telefonia**, **CRM**, **Usuários**
   - Salve e copie o **client_id** e o **client_secret**.
3. Abra o VoipSip Connector, informe o endereço do portal, o client_id e o client_secret, e clique em **Conectar**. O navegador pede a autorização no Bitrix24 e volta para o app.
4. Escolha o softphone:
   - **MicroSIP (Windows):** feche o MicroSIP e clique em *Configurar MicroSIP automaticamente*. O app grava os ganchos de evento e ativa a gravação no `microsip.ini`.
   - **WebRTC embutido:** cadastre a conta SIP. O PABX precisa aceitar SIP sobre WebSocket seguro (WSS).
5. No Bitrix24: **Telefonia → Configurações → Número padrão para chamadas de saída** → escolha a linha **VoipSip MicroSIP**.

Pronto: clique em qualquer telefone do CRM e a chamada sai pelo seu ramal.

> Cada atendente instala o app no próprio PC e conecta com o **próprio usuário** do Bitrix24. O app só atende os cliques desse usuário.

## Desenvolvimento

Requisitos: Node 22+.

```bash
npm install
npm run dev          # servidor local (5180) + Vite (8080) com proxy
npm test             # testes da UI (jsdom) e do servidor (node)
npm run electron:dev # app desktop apontando para o build local
npm run dist:win     # instalador Windows em release/ (dist:mac, dist:linux)
```

Para publicar uma versão, crie uma tag `vX.Y.Z` e faça push. O workflow `.github/workflows/release.yml` gera os instaladores e cria um rascunho de Release.

### Estrutura

| Caminho | O que é |
|---|---|
| `server/` | Servidor local (Hono + `node:sqlite`): OAuth, cliente REST do Bitrix24, polling de eventos offline, MicroSIP, histórico |
| `server/app.ts` | Todas as rotas HTTP (`/api/*`, `/bitrix/app`, `/hook/microsip/*`) |
| `server/calls.ts` | Ciclo de vida das chamadas (registrar, atender, finalizar, gravação) |
| `server/events.ts` | Leitura da fila offline, segura com vários PCs no mesmo portal |
| `server/microsip.ts` | Discagem, `microsip.ini`, scripts de evento e gravações |
| `electron/main.ts` | App desktop: janela, bandeja, iniciar com o sistema |
| `src/` | Interface React (Vite + shadcn/ui) |
| `src/lib/api.ts` | Cliente tipado da API local |
| `src/lib/webrtc-phone.ts` | Softphone WebRTC (sip.js) |

Os dados ficam em `%APPDATA%\VoipSip Connector` (Windows), `~/Library/Application Support/VoipSip Connector` (macOS) ou `~/.config/VoipSip Connector` (Linux).

### Segurança

- O servidor escuta só em `127.0.0.1`, recusa `Host` diferente de localhost (proteção contra DNS rebinding) e exige o cabeçalho `x-voipsip` em chamadas que alteram estado, o que impede outros sites de usar a API.
- Os ganchos do MicroSIP usam um token aleatório por instalação.
- Tokens recebidos do iframe do Bitrix24 são validados no portal antes de serem salvos, e o app nunca mistura dois portais.

## Pontos a validar em portal real

- **Conteúdo do `EVENT_DATA`** dos eventos offline de telefonia. O código aceita formato plano ou `{data: {...}}`, e o evento bruto fica em *Diagnóstico*.
- **Permissão de `event.offline.*`** para usuários que não são administradores. A documentação marca o escopo como *administrator*. Se falhar para atendentes comuns, o próximo passo é um modo "central", em que o PC de um admin distribui os cliques pela rede local.
- **Limite de requisições:** cada PC consulta a fila a cada 2 s (`VOIPSIP_POLL_MS`). Com muitos PCs no mesmo portal, aumente o intervalo ou use o modo central.
- **Nomes exatos dos comandos do MicroSIP** (`cmdCallStart`/`cmdCallEnd`…) na versão instalada.
- Gravações do softphone WebRTC ainda não são enviadas: o Bitrix24 aceita só mp3/wav.

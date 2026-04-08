# Configuração de Gravações no PABX para Bitrix24

Para que as gravações do MicroSIP apareçam automaticamente no Bitrix24, você deve configurar o seu provedor de telefonia (PABX) para enviar o link do áudio para o nosso webhook assim que a chamada terminar.

## URL do Webhook
A URL base para o seu projeto é:
`https://tequeyzhsixypnvevuiu.supabase.co/functions/v1/microsip-webhook`

### Parâmetros Necessários:
- `event`: `recording` (ou `hangup`)
- `company_id`: O ID da sua empresa no sistema (UUID)
- `number`: O número do telefone do cliente (ex: `5511999999999`)
- `recording_url`: O link direto para o arquivo de áudio (deve ser acessível publicamente pelo Bitrix24)
- `user_id`: (Opcional) O ID do usuário Bitrix que atendeu a chamada.

---

## Exemplo 1: 3C Plus
No painel da 3C Plus, vá em **Webhooks** e adicione uma nova URL para o evento de "Chamada Finalizada":

**URL:**
`https://tequeyzhsixypnvevuiu.supabase.co/functions/v1/microsip-webhook?event=recording&company_id=SEU_ID&number={customer_number}&recording_url={recording_url}`

---

## Exemplo 2: Asterisk / FreePBX
Se você usa um script de pós-processamento de chamadas, pode usar o `curl` para enviar a gravação:

```bash
curl -X GET "https://tequeyzhsixypnvevuiu.supabase.co/functions/v1/microsip-webhook?event=recording&company_id=SEU_ID&number=${PHONE}&recording_url=https://seu-pabx.com/audio/${FILENAME}.mp3"
```

---

## Exemplo 3: MicroSIP (Upload Local)
Se você **não** tem um PABX na nuvem e grava as chamadas apenas no seu computador, você precisará de um script (PowerShell ou Python) monitorando a pasta de gravações do MicroSIP (`Documents/MicroSIP`).

### Lógica do Script Local:
1. Detectar novo arquivo `.wav` ou `.mp3` na pasta.
2. Fazer o upload do arquivo para um serviço de nuvem (como o próprio Supabase Bucket).
3. Chamar o webhook enviando a URL gerada.

> [!NOTE]
> Se precisar de ajuda para criar esse script local, me avise e eu posso gerar o código PowerShell para você!

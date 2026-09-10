# SDR pelo WhatsApp oficial (Cloud API da Meta)

Escrito em 10/09/2026, no dia em que o número comercial do Gabriel foi banido depois de
meses pareado em clientes não oficiais (Z-API, Evolution, bridge). Regra a partir daqui:
robô de WhatsApp só pela API oficial, num número dedicado. Nunca mais número de pessoa.

## O que já está pronto no Worker (commit deste doc)

- Envio: `waSendText` usa a Cloud API quando `META_WA_TOKEN` e `META_WA_PHONE_ID` existem.
  Sem eles, tudo segue exatamente como antes (Evolution legado).
- Recebimento: rota `/api/workflowark/whatsapp/meta` (GET = handshake, POST = mensagens
  assinadas). Mensagem recebida cai na mesma esteira do SDR: robô responde lead, comandos
  `robo on/off/status` funcionam vindos do número do Gabriel (`SDR_AVISO_PHONE`).
- Áudio é transcrito e imagem descrita baixando a mídia pelo token, como na Evolution.
- Health: `GET /api/workflowark/sdr?health=1` mostra `canalOficial`.
- Teste local sem rede: `npm run teste:meta` (20 checagens: parser, handshake, assinatura).

## O que o Gabriel precisa fazer (uma vez, 30 min)

1. Chip ou número virtual novo, que NUNCA teve WhatsApp instalado no celular. Não usa o
   número pessoal nem o antigo comercial.
2. Meta Business Suite > Configurações > Contas do WhatsApp > Adicionar. Cria a conta do
   WhatsApp Business (WABA) e cadastra o número (verificação por SMS).
3. developers.facebook.com > Meus apps > Criar app (tipo Empresa) > adicionar produto
   WhatsApp. Na aba "Configuração da API" anota o **ID do número de telefone**.
4. Business Settings > Usuários do sistema > cria um usuário "workflowark-sdr" (admin),
   dá acesso ao app e à WABA, gera um **token permanente** com `whatsapp_business_messaging`
   e `whatsapp_business_management`.
5. Configurações do app > Básico: copia o **Segredo do app**.
6. No PC, dentro de `gest-odeagencia`:
   ```
   npx wrangler secret put META_WA_TOKEN         (token permanente do passo 4)
   npx wrangler secret put META_WA_PHONE_ID      (id do número do passo 3)
   npx wrangler secret put META_WA_APP_SECRET    (segredo do app do passo 5)
   npx wrangler secret put META_WA_VERIFY_TOKEN  (uma senha qualquer que você inventa)
   npx wrangler secret put SDR_AVISO_PHONE       (seu número pessoal, só dígitos, com 55)
   ```
7. No app da Meta > WhatsApp > Configuração > Webhook: URL
   `https://workflowark.arkcontent.workers.dev/api/workflowark/whatsapp/meta`, token de
   verificação = o mesmo `META_WA_VERIFY_TOKEN`. Clica em "Verificar e salvar" e assina o
   campo **messages**.
8. Prova: manda "oi" do seu celular pro número novo. O health tem que mostrar
   `ultimaEntradaMin: 0` e o robô responde. Manda "robo status" e ele devolve o painel.

## Limites da API oficial que valem saber

- Janela de 24 h: o robô só responde livremente em conversa que o cliente iniciou nas
  últimas 24 h. Pra puxar conversa do zero (prospecção ativa) precisa de template aprovado
  pela Meta. O SDR de hoje é reativo, então cabe.
- Custo: conversas iniciadas pelo cliente têm cota grátis mensal (1.000 conversas de
  serviço); acima disso é cobrado por conversa, centavos.
- O número fica preso à API: não dá pra usar no app do celular ao mesmo tempo. Por isso o
  número tem que ser dedicado.

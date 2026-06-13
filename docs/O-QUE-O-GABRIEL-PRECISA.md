# O que você precisa me passar (Gabriel)

Lista única do que falta pra ligar cada integração. É só pegar a chave/token onde indico e
colar **na aba Integrações** do app (ou me mandar aqui na conversa). Nada disso é urgente
de uma vez — vamos uma por uma, na ordem que você quiser.

> Regra de ouro: **chave/segredo nunca vai pro código nem pro GitHub.** Vai só pra:
> (a) aba Integrações do app, que guarda no servidor; ou (b) `npx wrangler secret put NOME`.

---

## 1. Meta (Facebook/Instagram Ads) — ler campanhas e relatórios
- **Onde pegar:** https://developers.facebook.com → seu App → Ferramentas → Graph API Explorer
  → gerar um *User Token* com as permissões `ads_read`, `read_insights`,
  `pages_read_engagement`, `instagram_basic`.
- **Melhor ainda (não expira):** gerar um *System User Token* em
  Business Settings → Users → System Users → Generate Token.
- **Onde colar:** aba **Integrações → Token da Meta**. Já está pronto pra receber.
- **Libera:** relatórios de gasto/ROAS/CTR por conta de anúncio dentro do app, e o Conselho
  passa a "ver" as campanhas.

## 2. Google Ads — campanhas de pesquisa
- **Onde pegar:** precisa de um *Developer Token* (Google Ads API Center) + OAuth do Google.
  É mais burocrático; quando você quiser, eu te passo o passo-a-passo da tela do Google Cloud.
- **Alternativa rápida:** o site **Metrifiquei** (você já tem conta) integra Meta+Google e
  cospe relatório. Posso ler de lá em vez de bater direto na API — me diga se prefere assim.

## 3. Google Calendar — JARVIS marcar eventos por prioridade (você pediu)
- **Por que precisa de você:** escrever na sua agenda exige consentimento OAuth com o escopo
  `https://www.googleapis.com/auth/calendar.events`.
- **Passo-a-passo (Google Cloud, ~10 min):**
  1. console.cloud.google.com → criar/usar um projeto.
  2. APIs e serviços → Biblioteca → ativar **Google Calendar API**.
  3. Tela de consentimento OAuth → tipo "Externo" → adicionar seu e-mail como usuário de teste.
  4. Credenciais → Criar credenciais → ID do cliente OAuth → tipo "App da Web" →
     URI de redirecionamento: `https://workflowark.arkcontent.workers.dev/api/google/callback`.
  5. Me manda o **Client ID** e o **Client Secret** (o secret eu guardo como segredo do servidor).
- **Libera:** JARVIS lê seus dias (até 2023), entende prioridades e **cria eventos de verdade**
  na sua agenda, sempre te mostrando antes pra aprovar.

## 4. Higgsfield — editor de vídeo por IA (o "robô que edita enquanto você dorme")
- **Onde pegar:** sua conta Higgsfield → API/Developer → gerar API Key. Coloca crédito lá
  (o crédito de vídeo é na Higgsfield, não no console da Cloudflare nem da OpenAI).
- **Onde colar:** me manda aqui ou aba Integrações (vou criar o campo). Guardo como segredo.
- **Libera:** o agente baixa os vídeos do Drive (Playwright), entende o roteiro e monta o corte.
  Detalhes da arquitetura em `MCP-EDITOR-VIDEO-HIGGSFIELD.md`.

## 5. E-mail (envio automático pela ARK)
- **Mais simples:** Cloudflare Email ou Resend (resend.com → API Key gratuita pra começar).
- **Onde colar:** me manda a API Key; configuro como segredo `RESEND_API_KEY`.
- **Libera:** o sistema/agentes mandam e-mail (relatórios, avisos) sozinhos.

## 6. mLabs — agendar postagens
- **Login que você já passou:** `gabrielkomercial@gmail.com`. O mLabs **não tem API pública
  aberta** pra todo plano. Dois caminhos:
  - (a) Se seu plano tiver API, me passa o token do painel.
  - (b) Senão, eu automatizo via navegador (Playwright) logando com seu usuário/senha — funciona,
    mas é mais frágil. Me diz qual prefere.

## 7. BI / Metrifiquei — métricas dos clientes (Vivenda)
- **Login que você já passou.** É leitura. Quando a gente for plugar, eu leio os números
  de lá pra alimentar relatórios e o Conselho. Você avisou que o BI às vezes erra orçamento —
  vou tratar como referência, não como verdade absoluta.

---

## Resumo rápido (marque conforme for me mandando)
- [ ] Token Meta
- [ ] Google Ads (ou OK pra usar o Metrifiquei)
- [ ] Google Calendar: Client ID + Client Secret
- [ ] Higgsfield API Key (+ crédito na conta)
- [ ] E-mail (Resend API Key)
- [ ] mLabs: token **ou** OK pra automação por navegador
- [ ] BI/Metrifiquei: confirmar que posso ler

Quando bater o "OK, manda o código", é só colar aqui que eu ligo na hora.

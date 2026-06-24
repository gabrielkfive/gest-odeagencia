# Plano técnico — Power Dialer + IA na call (Twilio)

Plano pra você decidir com base concreta. **Nada disso foi codado ainda** — depende das
decisões/credenciais no fim. Itens de pricing estão marcados "VERIFICAR" porque mudam (e
ligação pra **celular no Brasil é o item caro**).

> Fonte técnica: doc atual da Twilio (Programmable Voice, Media Streams, Voice JS SDK).

---

## ✅ DECISÕES TRAVADAS (2026-06-24)
- SDR liga **do navegador** (softphone, Twilio Voice JS SDK).
- Volume **~50 ligações/dia** (operação enxuta).
- **NÃO gravar / não transcrever** → a **Parte 2 (IA em tempo real na call) sai do escopo** por
  ora. Foco 100% no **power dialer**. (Se um dia liberar transcrição, a Parte 2 volta — a
  arquitetura com Media Streams + Durable Object continua válida.)

**Escopo ativo = Fases 1, 2 e (depois) 3.** Parte 2 / Fases 4-5 ficam arquivadas abaixo como referência.

---

## TL;DR
- **Provider recomendado:** Twilio (mais documentado e robusto pra dialer + áudio em tempo real).
- **Encaixa na nossa stack:** os endpoints viram Cloudflare Workers; o áudio ao vivo entra num
  **Durable Object** (mantém a conexão da call). LLM = Anthropic (já temos a key).
- **O que trava:** conta Twilio + número BR (tem burocracia regulatória) + orçamento + 3 decisões abaixo.

## Premissas que assumi (me corrija se for diferente)
1. O SDR liga **de dentro do WorkFlowArk, pelo navegador** (softphone via Twilio Voice JS SDK) —
   sem aparelho/PABX. Se for celular/PABX, o desenho muda.
2. Volume moderado (dezenas a poucas centenas de ligações/dia).
3. Pode **gravar/transcrever** a call com aviso de consentimento (LGPD).
4. Mercado Brasil (números e custos BR).

---

## Parte 1 — Power Dialer (MVP, sem IA)

**O que é:** o SDR puxa uma lista de leads (do CRM) e o sistema disca, conecta quem atende e
loga tudo no lead automaticamente.

**Fluxo técnico:**
- Worker endpoint dispara `calls.create({ to: lead, from: numeroARK, twiml: <Dial> conecta no
  softphone do SDR (ou conference), record: true })`.
- **Status callbacks** da Twilio (atendeu / não atendeu / ocupado / duração) → Worker → atualiza o
  CRM: cria `hist` no lead, marca resultado, joga no **Follow quente** se precisa retorno.
- Reusa o que já existe: CRM (`lead.hist`, follow quente), Cloudflare Worker pra endpoints e webhooks.

**Sobre "discagem paralela que descarta quem não atende" (predictive dialer):**
- Tecnicamente dá (disparar N `calls.create` simultâneos e conectar o 1º que atende), MAS predictive
  dialing tem implicação **legal/reputação** (chamadas abandonadas, bloqueio de número por spam).
- **MVP seguro = power/preview dialer:** disca 1 (ou 1–2) por vez, conecta no SDR, log automático.
- **Parallel "descarta quem não atende" = fase 3**, com cuidado de taxa de abandono.

## Parte 2 — IA em tempo real na call

**O que é:** enquanto o SDR fala, a IA transcreve, mostra um "bip de contexto" do lead e sugere
respostas na tela.

**Fluxo técnico:**
- TwiML `<Start><Stream url="wss://.../call/:id">` → áudio (mulaw 8kHz) chega num **Durable Object**
  no Cloudflare que segura a conexão da call.
- Áudio → **STT em streaming** (recomendo **Deepgram**, pt-BR e baixa latência) → texto parcial/final.
- Texto + contexto do lead (CRM) → **Anthropic** → sugestões em tempo real pro SDR + "bip de contexto"
  (resumo do lead no instante em que a call conecta).
- Alternativa mais simples (fase intermediária): `<Start><Transcription>` usa a transcrição nativa
  da Twilio em vez de Deepgram — menos peças, menos controle/latência.
- **LGPD:** abrir a call com aviso "esta ligação pode ser gravada e transcrita".

---

## Custos (faixa — VERIFICAR no pricing atual antes de decidir)
- **Twilio outbound BR:** fixo é barato; **celular BR é caro** (é o que pesa). Verificar US$/min atual.
- **Número BR:** mensalidade + **bundle regulatório** (Twilio exige CNPJ/endereço pra número brasileiro —
  leva alguns dias pra aprovar). Possível alternativa: caller ID verificado / número de outro país.
- **Media Streams:** custo pequeno/incluído.
- **Deepgram streaming:** ordem de ~US$ 0,004/min (verificar plano pt-BR).
- **LLM (Anthropic):** centavos por sugestão.

## Fases sugeridas (cada uma entrega valor sozinha)
1. Conta + número + **softphone no navegador** (SDR liga de dentro do app). 
2. **Power dialer sequencial** + log automático no CRM (já útil pro dia a dia).
3. **Parallel dialing** (descarta quem não atende) — com controle de abandono.
4. **Stream + STT + bip de contexto** do lead ao conectar.
5. **Sugestões da IA em tempo real** pro SDR.

---

## O que trava hoje (passo-a-passo da conta Twilio — ~10 min seus)
O código do dialer fala com a API da Twilio, então **sem conta não dá pra construir nem testar**.
Pra destravar a Fase 1:

1. Criar conta em **twilio.com** e fazer **upgrade** (sair do trial / colocar cartão).
2. **Console → Account → API keys & tokens:** me passar `Account SID` + criar uma **API Key**
   (Key SID + Secret). (Guardo como segredo do Worker, nunca no código/GitHub.)
3. **Iniciar um número BR** (Phone Numbers → Buy a number). O Brasil exige **bundle regulatório**
   (CNPJ + endereço da ARK) e leva alguns dias pra aprovar.
   - Atalho pra começar a testar **hoje**: usar um **número trial dos EUA** (sai na hora) e
     trocar pelo BR quando aprovar. Funciona pra provar a Fase 1.
4. Definir um **teto de gasto/mês** (pra eu travar limites e evitar susto na fatura).

Assim que eu tiver SID + API Key + número, **construo e VERIFICO a Fase 1** (clicar no lead e
ligar pelo navegador) — e seguimos pra Fase 2 (power dialer + log automático no CRM).

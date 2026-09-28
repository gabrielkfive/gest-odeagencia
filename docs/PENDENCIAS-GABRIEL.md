# Pendências do Gabriel, coisas que só você pode fazer

Lista viva das ações que dependem de você (criar conta, pagar, pegar chave, decidir).
Cada item destrava algo. Marque ✅ quando resolver. Conferida contra o código em 28/09/2026;
a lista única do que está pendente de verdade (sua e do código) fica em `memoria.md`,
seção "28/09/2026, estado real".

> Chave ou segredo **nunca** vai pro código nem pro GitHub: me manda aqui ou vai pra
> aba Integrações / `wrangler secret`. (Ver também `O-QUE-O-GABRIEL-PRECISA.md` pra a lista
> completa de integrações futuras.)

---

## 🔴 Aberto

### 1. Anthropic: API desligada desde 05/09 por falta de crédito
**Por que:** tudo que usa IA no servidor (agentes, conselho, legendas, roteirista,
planejamento, SDR) chama a API da Anthropic. Sem crédito, essas telas falham.
- [ ] Colocar crédito na conta da API (console.anthropic.com).
- [ ] Quitar a fatura **#KXTPRBDI-0004**, que recebeu lembrete de atraso até 15/08.
- [ ] Me avisar quando voltar, pra eu conferir se as chamadas respondem de novo.

### 2. Crédito promocional de US$ 250 do Claude Code na nuvem
- [ ] **Resgatar até 07/10/2026.** Depois de resgatado vence em **04/11/2026**.
- Atenção: o crédito se perde se o plano Max for cancelado.

### 3. Conta Twilio, destrava o Power Dialer do CRM
**Por que:** o power dialer inteiro fala com a API da Twilio. Não existe código da Twilio
no sistema ainda; sem conta, não dá pra construir nem testar.
**O que fazer (~10 min):**
- [ ] Criar conta em **twilio.com** + **upgrade** (sair do trial, colocar cartão).
- [ ] Me passar **Account SID** + criar uma **API Key** (Key SID + Secret).
- [ ] Comprar um número:
  - **Pra testar hoje:** número **trial dos EUA** (sai na hora).
  - **Definitivo:** número **BR** (exige bundle regulatório: CNPJ + endereço da ARK, leva uns dias).
- [ ] Definir um **teto de gasto por mês**.

**Quando você resolver:** eu construo e verifico a **Fase 1** (clicar no lead e ligar pelo
navegador), depois Fase 2 (power dialer + log automático no CRM). Detalhes em
`docs/PLANO-POWER-DIALER.md`.

### 4. Testar a Aprovação por link em produção, 1 min
**Por que:** o link público só dá pra confirmar 100% logado em produção. A tela de
aprovação dentro do /app foi provada na URL de produção em 22/09 (513a9c7), mas o teste
do link em aba anônima não tem registro.
- [ ] Abrir **workflowark.arkcontent.workers.dev** logado, página **Planejamento**.
- [ ] Gerar ou abrir um plano, clicar **"🔗 Link de aprovação"** (copia a URL).
- [ ] Abrir a URL numa aba anônima e conferir se o plano aparece e dá pra **Aprovar / Pedir ajuste**.
- [ ] Me dizer se funcionou (ou colar o erro).

### 5. Testar o Portal do cliente em produção, 1 min
O portal ganhou a aba de entregas em 21/09 (190e586) e o botão "Link do portal" na página
do cliente do /app. Falta o teste de ponta a ponta com você.
- [ ] Logado, **Planejamento**, gerar ou abrir um plano, **"🌐 Portal do cliente"** (copia o link).
- [ ] Abrir o link numa aba anônima, ver o plano do cliente e testar **abrir uma demanda**.
- [ ] Conferir se a demanda aparece no app (aba Demandas) com o nome do cliente.

### 6. Decisões da maratona de 22/09 que seguem paradas
- [ ] **Preço dos planos**: sem número, a landing `/conheca` segue sem seção de planos.
- [ ] **Aval da prévia de tokens do /app** (tarefa 06 do doc 11).
- [ ] **Canal do WhatsApp**: Evolution fora desde 06/09 e número comercial banido em 10/09.
  Decidir entre número novo ou a API oficial da Meta.

---

## ✅ Resolvido
- **Merge da confiabilidade do Kanban (10/09) em `main`**: feito. `src/lib/merge-estado.js`,
  `teste:merge` e `teste:confiabilidade` estão em `main` e as regras viraram a seção 7 do
  `CLAUDE.md`. O commit exato fica antes do início do clone raso (17/09).
- **Segurança do financeiro (Task #8)**: rota da planilha fechada e Cobranças/Acerto por
  papel desde 17/09 (827c703); matriz de papéis em 24/09 (39a0d35, 8272629). Sobra um
  resto técnico, sem ação sua: ver `docs/HANDOFF-financeiro-seguranca.md`.

---

## 📌 Lembrete pro Claude
- Voltar na Twilio assim que o Gabriel mandar SID + API Key + número, começando pela Fase 1.
- Quando a API da Anthropic voltar, conferir as rotas de IA antes de dizer que está no ar.

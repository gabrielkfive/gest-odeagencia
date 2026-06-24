# Pendências do Gabriel — coisas que só você pode fazer

Lista viva das ações que dependem de você (criar conta, pegar chave, decidir).
Cada item destrava algo que eu já deixei pronto pra construir. Marque ✅ quando resolver.

> Chave/segredo **nunca** vai pro código nem pro GitHub — me manda aqui ou vai pra
> aba Integrações / `wrangler secret`. (Ver também `O-QUE-O-GABRIEL-PRECISA.md` pra a lista
> completa de integrações futuras.)

---

## 🔴 Aberto

### 1. Conta Twilio — destrava o Power Dialer do CRM
**Por que:** o power dialer inteiro fala com a API da Twilio. Sem conta, não dá pra construir nem testar.
**O que fazer (~10 min):**
- [ ] Criar conta em **twilio.com** + **upgrade** (sair do trial / colocar cartão).
- [ ] Me passar **Account SID** + criar uma **API Key** (Key SID + Secret).
- [ ] Comprar um número:
  - **Pra testar hoje:** número **trial dos EUA** (sai na hora).
  - **Definitivo:** número **BR** (exige bundle regulatório — CNPJ + endereço da ARK, leva uns dias).
- [ ] Definir um **teto de gasto/mês**.

**Quando você resolver:** eu construo e verifico a **Fase 1** (clicar no lead e ligar pelo navegador),
depois Fase 2 (power dialer + log automático no CRM). Detalhes em `docs/PLANO-POWER-DIALER.md`.

---

### 2. Testar a Aprovação por link (em prod) — 1 min
**Por que:** o fluxo de gerar link é autenticado e o login local é quebrado (gotcha do service_role),
então só dá pra confirmar 100% logado em produção.
- [ ] Abrir **workflowark.arkcontent.workers.dev** logado → página **Planejamento**.
- [ ] Gerar/abrir um plano → clicar **"🔗 Link de aprovação"** (copia a URL).
- [ ] Abrir a URL numa aba anônima → conferir se o plano aparece e dá pra **Aprovar / Pedir ajuste**.
- [ ] Me dizer se funcionou (ou colar o erro). Se rolar, eu mostro o status da aprovação dentro do app também.

---

## ✅ Resolvido
_(nada ainda)_

---

## 📌 Lembrete pro Claude
- Voltar na Twilio assim que o Gabriel mandar SID + API Key + número → começar pela Fase 1.

# WorkFlowArk Next, lote 1: Início no molde "instrumento" (design próprio)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o Início do `/next` (cópia do sistema, `public/workflowark-next.html`) pelo molde "instrumento, não formulário" do doc 07, lendo o mesmo estado real e sem tocar no `/app`.

**Architecture:** O `/next` é o monolito copiado mais uma pele (`workflowark-next-<data>.css` e `.js`) carregada só quando `body.next`. O lote 1 acrescenta um bloco `#nx-inicio` em `#page-dashboard`, renderizado pela pele a partir de `state.tarefas`, `CLIENTES`, `state.cobranca` e `wfa-editorial`. O cálculo dos números fica num arquivo puro (`workflowark-next-calc-<data>.js`, funciona em Node e no navegador) para ser testado sem navegador. O herói antigo (`.aura-hero-row`) some no `/next` via CSS. Sidebar, Kanban e modais continuam como estão (decisão do Gabriel de 21/09).

**Tech Stack:** JS puro (IIFE no navegador, CommonJS no Node), CSS puro, fonte Doto (Google Fonts) só para numerais, Playwright (`playwright-core` + Chrome instalado) para prova.

**Spec:** `C:\Users\USER\Documents\WorkFlowArk-Next-2026-09-20\07-MELHOR-DO-AGENCYFLOW-E-DESIGN-PROPRIO.md` (seções 3, 4 e 5).

## Global Constraints

- Sem traço, travessão nem linha de traços em texto de tela, comentário visível ou commit.
- Nenhum número inventado: sem dado, o cartão mostra "sem dados" em cinza.
- Nada criado automaticamente (tarefa, notificação, cartão).
- Acento é o amarelo ARK `#ffd400` (identidade), não o lima da referência. O resto dos tokens vem do doc 07, seção 4.
- Fundo preto do tema escuro fica; vidro só na sidebar (decisão de 21/09 registrada no CSS da pele).
- Arquivo da pele leva a data no nome: ao mudar o conteúdo, `git mv` para `20260921b` e trocar a referência no HTML e o marcador `<!-- build NEXT 20260921i -->`.
- `npm run build` e `node deploy/prova-next-copia.mjs` passam antes do commit. Deploy só por commit + push em `main`, com `gh run list` verde e marcador conferido na URL (skill deploy-verificado).
- Elementos com fundo claro ou gradiente que não podem ser escurecidos pelo normalizador AURA levam `data-aura-keep`.

---

### Task 1: Cálculo puro do Início (TDD)

**Files:**
- Create: `public/workflowark-next-calc-20260921b.js`
- Test: `deploy/teste-next-inicio.mjs`

**Interfaces:**
- Produces: `NX_CALC.inicio({ tarefas, clientes, editorial, cobranca, hoje, nome, gestor })` → `{ kpis:{hoje,atrasadas,aprovacao,publicamSemana}, saude:{verdes,total,sinais:{[cliId]:[{cor,rotulo,detalhe}]}}, prazo:{ok,total,pct|null}, linha:[{dia,cor,titulo}], atencao:[{id,nm,n,rotulo}] }`
- Em Node: `module.exports = NX_CALC`; no navegador: `window.NX_CALC`.

- [ ] **Step 1: Escrever o teste que falha** em `deploy/teste-next-inicio.mjs`, com carteira sintética (3 clientes, 8 tarefas) e asserções: `kpis.atrasadas === 2`, `kpis.aprovacao === 2`, `saude.verdes === 1` de `total === 3`, `prazo.pct === 50`, `linha` tem 3 pontos no mês, `atencao[0].id === 'fercon'`, e com `tarefas: []` o `prazo.pct === null`.
- [ ] **Step 2: Rodar** `node deploy/teste-next-inicio.mjs` e ver falhar por módulo inexistente.
- [ ] **Step 3: Implementar** `NX_CALC.inicio` com as regras: atrasada = `data < hoje && status !== 'concluido'`; aprovação = `status in (aprovacao, homologcli)`; publicam na semana = `publicarEm` entre hoje e hoje+6; sinal do cliente = mesma regra da aba Saúde da página do cliente (atraso, aprovação parada > 3 dias, sem entrega no mês, churn); verde = cliente ativo sem sinal; no prazo = concluída no mês com `concluidaEm.slice(0,10) <= data`; linha = tarefas com `publicarEm` no mês (cor por status) mais editorial; atenção = 3 clientes com mais sinais.
- [ ] **Step 4: Rodar** o teste e ver passar.
- [ ] **Step 5: Commit** `Next: cálculo puro do Início (KPIs, saúde da carteira, no prazo) com teste em deploy/`.

### Task 2: Tokens e CSS do Início (ARK Glass e ARK Soft)

**Files:**
- Modify: `public/workflowark-next-20260921a.css` → `git mv` para `public/workflowark-next-20260921b.css`, acrescentar bloco `#nx-inicio`.
- Modify: `public/workflowark-next.html` (link do CSS, fonte Doto no `<link>` do Google Fonts, marcador de build).

- [ ] **Step 1:** `git mv` do CSS, trocar a referência no HTML, marcador `<!-- build NEXT 20260921i -->`.
- [ ] **Step 2:** Adicionar `&family=Doto:wght@700` ao `<link>` do Google Fonts (só esse arquivo, o `/app` não muda).
- [ ] **Step 3:** CSS com variáveis em `body.next` (escuro) e `body.next.aura-light` (claro): superfície, texto, decimal, acento `#ffd400`, alerta `#F08A2E`, aurora bom (`#F2A33A` para `#3FBF5A`) e atenção (`#7FB3E6` para `#F2A33A`); classes `.nxi-kpi .n` (Doto 44px), `.nxi-tl` (linha do mês), `.nxi-aurora` (raio 28, `data-aura-keep`), `.nxi-mini` (cliente que pede atenção), `.nxi-vazio` (sem dados). `body.next .aura-hero-row{display:none}`. Celular: KPIs em 2 colunas, auroras empilhadas. `prefers-reduced-motion` desliga o reveal.
- [ ] **Step 4:** Commit `Next: tokens ARK Glass e ARK Soft do Início (arquivo datado 20260921b)`.

### Task 3: Render do Início na pele

**Files:**
- Modify: `public/workflowark-next-20260921a.js` → `git mv` para `public/workflowark-next-20260921b.js`, acrescentar bloco "Início instrumento".
- Modify: `public/workflowark-next.html` (script da calc antes da pele, script da pele renomeado).

**Interfaces:**
- Consumes: `NX_CALC.inicio`, `state`, `CLIENTES`, `WFA_MEMBER`, `MD_MANAGERS`, `hojeSP()`, `cliAreaSelect(id)`, `openTaskDetail(id)`.

- [ ] **Step 1:** Função `nxInicioRender()`: monta `#nx-inicio` depois de `.page-head` em `#page-dashboard` (cria uma vez, depois só troca o HTML se a assinatura dos números mudou, como o `md-kpis` faz). Estrutura: linha de KPIs (Vencem hoje, Atrasadas, Em aprovação, Publicam esta semana) em Doto; linha do mês com um ponto por entrega e marcador "hoje"; dois cartões aurora (Saúde da carteira: `verdes` grande, "X de Y clientes sem alerta"; Entregas no prazo: `pct%` ou "sem dados"); três minis de atenção (nome do cliente, número, rótulo) que abrem a página do cliente.
- [ ] **Step 2:** Enganchar: chamar depois de `renderMeuDia` (envolver `window.renderMeuDia` como o Projetos faz com `renderProjetos`) e a cada 60 s.
- [ ] **Step 3:** Rodar `node deploy/prova-next-copia.mjs` e conferir que os testes antigos continuam verdes (41 navs, sidebar no celular, cartão de post grava).
- [ ] **Step 4:** Commit `Next: Início no molde instrumento (KPIs em matriz de pontos, linha do mês, saúde da carteira e no prazo)`.

### Task 4: Prova lado a lado e teste de prova

**Files:**
- Modify: `deploy/prova-next-copia.mjs` (asserções: `#nx-inicio` existe, 4 KPIs, 2 auroras, `.aura-hero-row` escondido; captura `prova-next-inicio-<w>.png` claro e escuro).
- Create: `deploy/prova-next-inicio-lado-a-lado.html` (referência à esquerda, captura à direita, para o Gabriel abrir).

- [ ] **Step 1:** Acrescentar as asserções e capturas ao harness. Rodar e ver verde.
- [ ] **Step 2:** Abrir as capturas, comparar com `SnapInsta.to_730628403…` (claro) e `SnapInsta.to_797903887…` (escuro) e anotar 3 diferenças restantes no relatório.
- [ ] **Step 3:** `npm run build` verde. Commit `Next: prova do Início no harness (claro e escuro, 1440 e 390)`.

### Task 5: Mesclar e publicar

- [ ] **Step 1:** Mesclar a branch do worktree em `main` (fast-forward ou merge sem tocar no trabalho não commitado da outra sessão), push.
- [ ] **Step 2:** `gh run list --limit 1` até `success`. Conferir `<!-- build NEXT 20260921i -->` na URL `https://workflowark.arkcontent.workers.dev/workflowark-next.html` (skill deploy-verificado) e screenshot do `/next` em produção.
- [ ] **Step 3:** Registrar no Ark Brain e na memória local; relatório com URL, marcador e as capturas.

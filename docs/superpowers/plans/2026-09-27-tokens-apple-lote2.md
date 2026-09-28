# Tokens do /app (lote 2 do doc 11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um arquivo único de tokens no /app, com os valores do doc 11 alinhados à referência Apple, sem mudar layout.

**Architecture:** `public/workflowark-tokens-20260927a.css` passa a ser o único lugar onde `:root`, `body.aura-dark` e `body.aura-light` declaram variáveis. Fase A move as declarações de hoje com o valor final que já vale (pixel igual). Fase B troca os valores e aplica a escala tipográfica pelas variáveis.

**Tech Stack:** CSS puro, Python 3.13 + Playwright (Chrome) para prova, Cloudflare Workers via CI do `main`.

**Spec:** `Documents/WorkFlowArk-Next-2026-09-20/11-apple-no-app-e-plano-de-venda.html` (Parte 1, Tokens) + `ferramentas/awesome-design-md/design-md/apple/DESIGN.md`.

## Global Constraints

- Sem mudança de layout (grade, colunas, ordem, tamanhos de caixa).
- Amarelo #FFC700 é o único acento; verde e vermelho só em status.
- Fundo claro fica #fbfbfd (feedback do Gabriel contra #f5f5f7, registrado no CSS).
- Sidebar arredondada com vidro e Kanban ficam como estão, só herdam tokens.
- Sem traço ou travessão em texto novo. Marcador de build novo em `public/workflowark.html`.

## Review Focus

- Variável usada e não definida depois da mudança: a declaração inteira cai (bug antigo de `--card`). Teste lista uso x definição.
- Tema claro: token escuro vazando para o claro. Prova captura os dois temas.
- Texto sobre amarelo continua escuro (`#131316`), contraste mantido.
- Celular 390 px: nada estoura. Prova captura Início no celular.
- Cache: arquivo novo tem nome datado; nada depende de cache velho.

---

### Task 1: Teste de fonte única (falha antes)

**Files:** Create `deploy/teste-tokens.py`

- [ ] Script falha se: algum `:root`/`body.aura-dark`/`body.aura-light` fora do arquivo de tokens declara `--var`; o HTML não liga o arquivo de tokens antes de `workflowark-20260915a.css`; alguma `var(--x)` usada no CSS ou HTML não tem definição (ignorando as com fallback e as locais `--tf-*`, `--cl-*`, `--nxc-*`).
- [ ] Rodar `python deploy/teste-tokens.py`: FALHA (arquivo não existe).

### Task 2: Fase A, consolidação sem mudança de pixel

**Files:** Create `public/workflowark-tokens-20260927a.css`; Modify `public/workflowark-20260915a.css` (blocos nas linhas 1, 191, 632, 706, 871), `public/workflowark.html:51`.

- [ ] Capturar `antes` das 6 telas nos 2 temas + Início no celular com `deploy/prova-tokens.py antes`.
- [ ] Script de migração move as declarações (último valor vence, na ordem da cascata) para o arquivo de tokens; blocos que ficam vazios saem.
- [ ] `python deploy/teste-tokens.py`: PASSA.
- [ ] `deploy/prova-tokens.py faseA` + diff de pixel contra `antes`: 0 px diferentes em todas as capturas.
- [ ] Commit.

### Task 3: Fase B, valores do doc 11 e escala tipográfica

**Files:** Modify `public/workflowark-tokens-20260927a.css`, marcador em `public/workflowark.html`.

- [ ] Escuro: `--bg #0B0B0C`, `--surface #141416`, `--surface-2 #1C1C1F`, `--ink/--txt #F5F5F7`, `--mute #A1A1A6`, `--mute-2 #6E6E73`, `--line rgba(255,255,255,.08)`, `--green #4ADE80`, `--red #F87171`, fundo do body e `.app` por `var(--bg)`.
- [ ] Claro: `--surface #fff`, `--ink/--txt #1D1D1F`, `--line rgba(0,0,0,.06)`, `--bg #fbfbfd`.
- [ ] Escala: `--fs-title 28px`, `--fs-section 17px`, `--fs-body 14px`, `--fs-label 12px`, `--fw-head 600`, tracking Apple (-0.374px a 17px, -0.28px no título); raios `--r-card 16px`, `--r-btn 10px`, `--r-chip 999px`; sombra de painel `0 24px 64px rgba(0,0,0,.45)`. Aplicados em `.page-title h1`, `.page-head h1`, `.card`, `.kpi`, `.kpi .l`.
- [ ] `python deploy/teste-tokens.py`: PASSA. `deploy/prova-tokens.py depois` + lado a lado `antes | depois` por tela.
- [ ] Commit.

### Task 4: Deploy verificado

- [ ] PR para `main`, CI verde, marcador novo em `https://workflowark.arkcontent.workers.dev/workflowark.html`, `deploy/prova-tokens.py producao <url>` claro e escuro.
- [ ] Registro no doc 11 (lote 2 no ar) e no Ark Brain.

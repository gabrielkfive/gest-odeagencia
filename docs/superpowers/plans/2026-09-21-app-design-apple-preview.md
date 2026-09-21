# /app design Apple (doc 11, Parte 1) em prévia visível

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** aplicar os tokens do doc 11 no `/app` como um arquivo de design datado e publicar uma cópia estática, sem login, pro Gabriel avaliar antes de ir pra produção.

**Architecture:** `public/workflowark-design-20260921a.css` (só variáveis e overrides de tipo, cor, borda, raio, espaçamento e movimento; nenhum `position`/`transform`), ligado depois dos outros CSS em `workflowark.html`. Sidebar e Kanban mantêm forma. Prévia: pasta `v2/public/app-preview/` no Worker `workflowark-v2` com `index.html` = cópia do `workflowark.html` + script de semente (sessão falsa + carteira sintética) injetado no `<head>`.

**Spec:** `Documents\WorkFlowArk-Next-2026-09-20\11-apple-no-app-e-plano-de-venda.html`, Parte 1.

## Global Constraints
- Sem traço nem travessão. Nada automático. Nenhum número inventado.
- Marcador `<!-- build 20260921g-design-apple -->`; produção só depois do "é isso".
- `npm run teste:mobile` verde; capturas antes x depois (escuro, claro, celular) de Início, Kanban, Cliente, CRM, modal.

### Task 1: arquivo de design
- Create `public/workflowark-design-20260921a.css` com: escala tipográfica (h1 28/600, seção 17/600, corpo 14, rótulo 12 sem caixa alta e sem mono), acento único, cartão #141416 r16 borda .08, sombra só em painel, grade 8, mola 0,3 s, movimento reduzido.
- Modify `public/workflowark.html`: link do CSS, subitem "Gestão de clientes" em Atividades, marcador.
- [ ] `node --check` não se aplica; `teste:mobile` verde.

### Task 2: prévia visível
- Create `v2/public/app-preview/index.html` (cópia + semente) e copiar css/js/vendor necessários.
- [ ] `wrangler deploy` do Worker v2; curl do marcador em `/app-preview/`; capturas na URL.

### Task 3: prova lado a lado
- [ ] `lp/` (antes, produção) x `lp/preview/` (depois, prévia) nas 5 telas; imagem combinada por tela.

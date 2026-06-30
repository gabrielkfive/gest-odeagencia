# Export `.xlsx` multi-aba do Squad Alpha

**Data:** 2026-06-25
**Arquivo afetado:** `public/workflowark.html` (único)

## Objetivo

Trocar o export atual do Squad Alpha (truque de tabela-HTML `.xls`, uma aba por
arquivo, com aviso do Excel) por **um único arquivo `.xlsx` nativo contendo as 5
sub-abas como planilhas separadas**, preservando cores/flags. Escolha do Gabriel:
escopo = só o Squad Alpha; objetivo principal = várias abas num arquivo só.

CRM e Planilha continuam CSV (fora de escopo). Sem mudança no formato dos dados salvos.

## Abordagem

`.xlsx` de verdade via **ExcelJS** (MIT), carregado sob demanda da mesma CDN que o
app já usa pro Supabase (`cdn.jsdelivr.net`). Sem CSP no app → sem bloqueio. SheetJS
grátis foi descartado (não pinta célula → perderia as flags). O `.xls` HTML foi
descartado (multi-aba frágil + aviso do Excel).

## Componentes

### 1. `loadExcelJS()`
Injeta o `<script>` do ExcelJS no primeiro clique e cacheia a `Promise`. Resolve com
`window.ExcelJS`. Rejeita se falhar (offline) → o chamador mostra toast e aborta.

### 2. `alphaExportXlsx()` (async)
Monta um `ExcelJS.Workbook` com 5 worksheets na ordem das sub-abas:

- **Acompanhamento** — de `alphaRows()` + `ALPHA_GROUPS`/`ALPHA_COLS`.
  - Cabeçalho em 2 linhas: linha de grupos (células mescladas por `g.g`, pulando
    `sticky`) + linha de colunas (`c.l`).
  - `t:'bool'` → `✔`/vazio; `t:'flag'` → texto + **fill colorido**
    (CRITICAL/DANGER vermelho `FDE2E2`/`991B1B`, CARE amarelo `FFF3CD`/`8A6D00`,
    HEALTHY/OK verde `D8F5DD`/`166534`); coluna Cliente (`sticky`) em negrito.
- **Business Score** — achatado: linha "Score geral: N%", depois por pilar
  (`ALPHA_BS`): cabeçalho do pilar (nome, Peso X%) e linhas de métrica
  (label, Atingido `bsVal.a`, Meta `bsVal.m`, % `bsMetPct`). % colorido por faixa
  (≥80 verde, ≥50 amarelo, <50 vermelho).
- **Account Manager / Gestor de Tráfego / Criador** — de `gridRows(id)` +
  `ALPHA_GRIDS[id].cols`. `t:'bool'` → `✔`; resto texto.

Estilo geral: header fundo escuro `0B0B0C` texto branco negrito; bordas finas;
largura de coluna automática (por maior conteúdo, com teto). Nome: `squad-alpha.xlsx`.
Download via `workbook.xlsx.writeBuffer()` → `Blob` → link `download`.

### 3. Wire-up
Botão "Exportar" do Squad Alpha (`onclick="alphaExportCSV()"`) passa a chamar
`alphaExportXlsx()`. Funções `.xls` antigas (`alphaExportCSV`, `gridExport`) removidas
(eram usadas só por esse botão). Toast de sucesso:
"Squad Alpha exportado pro Excel (5 abas, com cores) ✓".

### 4. Erros
ExcelJS não carrega (offline) → toast "Sem internet pra gerar o Excel — tente
conectado" e aborta sem quebrar a UI. (O app já depende de CDN no boot — não é
regressão real.)

## Verificação
Playwright em `http://localhost:8080/workflowark.html` (UI sem login, semeando
`localStorage`): abrir Squad Alpha, clicar Exportar, confirmar que baixa
`squad-alpha.xlsx`; reabrir o buffer e checar que tem 5 worksheets com os nomes certos
e que as flags têm fill. Sem console errors.

## Fora de escopo
CRM/Planilha (seguem CSV); botão de exportar só a aba ativa; mudança no schema de dados.

# Onboarding v2 do modo agência · Implementation Plan

> Execução: nativa (o próprio agente, pedido do Gabriel em 23/09: "puxa o superpowers pra pensar e já executa"). Steps com `- [ ]`.

**Goal:** o dono de outra agência (a "agência do Zé") entra num sistema com a cara dele (WorkFlowZé), configura tudo numa página de Configurações de verdade e passa por um primeiro acesso curto de 3 passos, sem ver nada técnico ou da ARK.

**Architecture:** regra de marca pura em `src/lib/marca-agencia.js` (usada pela entrada React) espelhada no núcleo `window.WFA_AGENCIA` do novo `public/workflowark-agencia-20260923c.js` (usado pelo app legado), com teste que prova que as duas concordam. O módulo novo substitui cartão, tour e "onde fica" (20260923a) por um assistente em tela cheia e uma página de Configurações que toma o lugar do modal só no modo agência. O modal da ARK ganha a aba Marca (conserto do bug Marca -> Integrações).

**Tech Stack:** React 19 + TanStack (entrada `/auth`), JS puro no monolito `public/workflowark.html`, testes em node (`deploy/teste-agencia.mjs`), prova Playwright em python.

**Spec:** pedido do Gabriel (áudio de 23/09 colado na conversa) + `docs/superpowers/specs/2026-09-23-agencia-teste-design.md` + referências em `deploy/ref-onboarding/` (AgencyFlow onboarding 3 passos; Modo Criador Configurações Geral/Marca, importar clientes, ajustar foto).

## Global Constraints
- ARK intacta: domínio da ARK sem `?agencia=1` não muda nada (entrada, modal, abas).
- Produção não recebe deploy: só `wrangler versions upload`, marcador `onboarding-20260923c`.
- Texto visível sem travessão nem meio traço (a prova faz grep pelos dois caracteres) e sem número inventado.
- Nada criado automaticamente: importar cliente NÃO gera tarefas de onboarding (não chama `onboardingGerar`).
- Arquivo do app com data no nome: módulo novo `workflowark-agencia-20260923c.js`, referência trocada no HTML, marcador `<!-- build ... -->` trocado.
- Mobile é produção: `npm run teste:mobile` e `teste:tema` verdes.

## Review Focus
1. Nome com acento, nome composto e palavra genérica ("Agência do Zé Marketing") vira "WorkFlowZé", não "WorkFlowAgência": teste em `nomeCurto`.
2. Cor escura escolhida pela agência deixa texto sobre botão ilegível: `corAceita` recusa luminância baixa, teste.
3. Planilha vinda do Excel brasileiro (separador `;`, aspas, cabeçalho "Cliente", valor "R$ 1.500,00"): parse correto, teste.
4. Cliente da planilha que já existe na carteira não duplica: teste em `clientesDaPlanilha`.
5. Pular todos os passos do assistente não deixa a tela travada e o assistente não volta a cada recarga: prova Playwright.

---

### Task 1: regra de marca pura (TS e núcleo do app) com teste
**Files:** Create `src/lib/marca-agencia.js` + `.d.ts`; Test `deploy/teste-agencia.mjs`.
**Produces:** `nomeCurto(marca) -> string`, `nomeProduto(marca) -> string` ("WorkFlowArk" sem marca), `corAceita(hex) -> boolean`, `corSobre(hex) -> "#111111"|"#ffffff"`.
- [ ] Testes primeiro: Zé -> WorkFlowZé; "Agência Z Digital" -> WorkFlowZ; "Agência do Zé Marketing" -> WorkFlowZé; `short:"Zezinho"` vence; vazio -> WorkFlowArk; "ARK Content" -> WorkFlowArk; nome curto limitado a 14; `#FFC700` aceita, `#0b1f44` recusa; as duas implementações (TS e núcleo) dão o mesmo resultado numa lista de casos.
- [ ] Rodar `npm run teste:agencia`: falha.
- [ ] Implementar nas duas.
- [ ] Rodar: passa. Commit.

### Task 2: planilha de clientes (parse puro) com teste
**Files:** núcleo em `public/workflowark-agencia-20260923c.js`; Test `deploy/teste-agencia.mjs`.
**Produces:** `lerPlanilha(texto) -> {cabecalho, linhas}`, `clientesDaPlanilha(texto, existentes) -> [{nm, valor, tipo, meta, repetido}]`, `modeloCsv() -> string`.
- [ ] Testes: `;`, `,` e tab; aspas com separador dentro; cabeçalho detectado (Cliente/Nome/Empresa, Valor/Mensalidade/Fee, Tipo/Plano/Modelo, Instagram, Contato/Responsável); sem cabeçalho = 1ª coluna é o nome; "R$ 1.500,00" -> 1500; linha vazia ignorada; repetido marcado (sem acento e caixa).
- [ ] Implementar. Rodar verde. Commit.

### Task 3: assistente de primeiro acesso (3 passos) e página de Configurações
**Files:** Create `public/workflowark-agencia-20260923c.js` (núcleo 20260923a + Tasks 1 e 2 + tela); Delete `public/workflowark-agencia-20260923a.js` (git mv); Modify `public/workflowark.html` (referência e marcador).
- Assistente (padrão AgencyFlow): cartão central, "1 de 3" com barra, Pular em todo passo. Passo 1 Sua agência: logo (arquivo reduzido a 256px), nome, nome curto, cor em paleta + personalizada com `corAceita`, prévia ao vivo "WorkFlowZé". Passo 2 Seus clientes: cartões Planilha / Cadastrar na mão; planilha abre arquivo .csv/.txt ou colar do Excel, tabela de revisão com caixa por linha, "Importar N clientes" grava via `saveClientesCustom`; modelo .csv pra baixar. Passo 3 Sua equipe: e-mail + papel, Convidar (`cloudCall('save',{action:'add-member'})`), lista dos convidados. Fim: "Tudo pronto", Ir para o Meu Dia. Chave `wfa-agencia-inicio-v2-<membro>`.
- Configurações (padrão Modo Criador): página inteira, título, abas Agência, Equipe, Clientes, Integrações, Conta. Agência = mesmo formulário do passo 1 + link público explicado. Equipe = membros + convite + papéis. Clientes = Novo cliente, importar planilha. Integrações = atalho pra página existente. Conta = nome de exibição, sair, refazer configuração inicial. `openSettings` troca pra essa página só no modo agência.
- Título da aba = `nomeProduto`, favicon = logo, `--yel` = cor.
- [ ] Implementar, abrir local com domínio simulado, clicar cada botão.

### Task 4: entrada white label caprichada
**Files:** Modify `src/routes/auth.tsx` (componente `EntradaAgencia` separado; ramo ARK intocado).
- Fundo escuro limpo com brilho da cor da agência, logo ou monograma com a inicial, "WorkFlowZé", "Bom te ver de novo." / criar acesso com aviso de teste, cor da agência no botão e no foco, título da aba `Entrar · WorkFlowZé`.
- [ ] Implementar, `npm run build` verde.

### Task 5: aba Marca no modal da ARK (bug Marca -> Integrações)
**Files:** Modify `public/workflowark.html` (aba e painel `marca`; bloco Marca sai de Conta; botão Sistema > Marca chama `setTab('marca')`).
- [ ] Implementar; prova clica Sistema > Marca e vê o painel Marca aberto.

### Task 6: provas e prévia
- [ ] `npm run teste:agencia`, `teste:mobile`, `teste:tema`, `npm run build`.
- [ ] `deploy/prova-agencia-v2.py`: domínio simulado agencia-ze.test com API bloqueada, marca "Zé": entrada WorkFlowZé, assistente 3 passos, importação de CSV de exemplo, Configurações, 1440 e 390 claro e escuro, ARK intacta, marca na ARK abre Marca.
- [ ] `wrangler versions upload`, curl do marcador, commit e push.

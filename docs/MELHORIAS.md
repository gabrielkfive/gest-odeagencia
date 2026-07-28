# Melhorias do WorkFlowArk — lista viva (continuável)

Registro numerado do que a gente vai melhorando, pra manter consistência e continuidade
entre sessões. Cada item: o que é, status e (quando subiu) a versão/commit.

> Como usar: quando terminar e subir uma melhoria, marque ✅ e anote o commit.
> Quando for começar, é só dizer "continua a lista" que a gente pega do próximo item aberto.

---

## Concluídas e no ar

> Obs: a numeração 1–6 foi reconstruída a partir do histórico do Git (a lista original
> de ontem não tinha sido salva em arquivo). Da nº7 em diante é registrada na hora.

1. ✅ Tarefas: modal estilo Trello (timer, comentários, anexos) — commit `cb4e1f1`
2. ✅ Clientes: relatório do cliente em 1 clique (botão no card) — commit `85fcf26`
3. ✅ Clientes: alerta de saúde no topo da página (sem flood) — commit `2ed7f61`
4. ✅ Planejamento: design premium + salvar no Drive do cliente + virar tarefa — commit `5890b09`
5. ✅ Legendas: botão Salvar no Drive (pasta Legendas do cliente) — commit `9eb9eb3`
6. ✅ Banco de criativos que performaram (por cliente) + alimenta o Roteirista — commit `a2a2ce8`
   - (no mesmo dia também: Onboarding de novo cliente — commit `92000f4`)
7. ✅ **(2026-06-24)** CRM: leads paravam de sumir — mescla por id + lápide — commit `04f7181`
8. ✅ **(2026-06-24)** Meu Painel: layout de desktop decente (grid 4 col, 3 tamanhos = largura,
   home no painel, widgets afinados) — commit `7c9d709`
9. ✅ **(2026-06-24)** Meu Painel: 4 widgets novos — Clientes & saúde, Conselho de IA,
   Cobrança do mês, Próximas captações (todos com dado real) — commit `e5e63f0`
10. ✅ **(2026-06-24)** CRM: Follow quente — faixa dedicada no topo (leads marcados 🔥
    ou com próxima ação vencida/pra hoje) + toggle 🔥 em cada card

### (2026-06-30) Experiência por papel — em VERSÃO DE TESTE (aguarda aprovação do Gabriel)
Branch `persona-painel-allhands` · preview `https://d0031290-workflowark.arkcontent.workers.dev` · produção intacta.
11. ✅ **Painel por papel automático** — cada ROLE entra com preset de widgets certo pra função (`MDW_PRESETS`, `mdwPresetFor`, botão `mdwApplyPreset`).
12. ✅ **Widget Comercial · pipeline** — lê o CRM real: quem ativar/follow hoje, cotar (proposta), fechar (negociação) + valor. Pedido de Gabriel/Saulo.
13. ✅ **Widget Minha Rotina por papel** — `ROTINA_POPS` derivado dos 22 POPs, com cadência e check diário que reseta sozinho (foge do "só Kanban").
14. ✅ **Meu Dia + Meu Painel fundidos** numa home só ("Meu Dia" = painel personalizável com saudação); aba duplicada escondida (`HIDDEN_NAV`).
> Verificado com Playwright (0 erros de console, widgets com dado, toggle da rotina ok). Build OK.
> Próximo (feedback): comercial mais detalhado + aba comercial própria; Drive/POPs na mão do Saulo; portal por papel.

## Próximas (abertas)

### CRM Power Dialer — spec travado, aguardando conta Twilio
- [ ] CRM: power dialer (softphone no navegador, ~50 lig./dia, sem gravação) — **Fase 1 pronta pra começar**
  > Decisões travadas (2026-06-24): liga do navegador · ~50/dia · NÃO gravar.
  > Escopo = power dialer puro (a IA em tempo real na call saiu por ora — depende de transcrição).
  > **Bloqueio único:** Gabriel abrir conta Twilio + número (passo-a-passo em `docs/PLANO-POWER-DIALER.md`).
  > Assim que houver SID + API Key + número, construo e verifico a Fase 1.

### Backlog de ONTEM (06-23) — recuperado do transcript da sessão `26224ad4`
> Os itens 1–6 acima (modal tarefas, relatório, saúde, planejamento/calendário, legendas,
> banco de criativos) + onboarding eram desta lista e foram concluídos/subidos ontem.
> O que sobrou de ontem, ainda ABERTO:

- [x] **Aprovação de conteúdo pelo cliente (por link)** ✅ no ar (commit `5521dd8`) — botão "Link de aprovação"
  no Planejamento gera URL pública `/aprovar?t=…`; cliente aprova/pede ajuste sem login.
  ⚠️ **Falta o Gabriel testar em prod** (gerar link logado → abrir → aprovar) — ver `PENDENCIAS-GABRIEL.md`.
- [x] **Roteirista autônomo** ✅ no ar (commit `8ea7467`) — botão "🎬 Roteirizar tudo" no Planejamento
  percorre as ideias do plano e gera o roteiro de cada uma (brief real do cliente entra no servidor),
  juntando na saída do Roteirista pra salvar no Drive. Sem caixinha de prompt.
- [ ] **JARVIS: barge-in real** — interromper o JARVIS falando por cima (precisa cancelamento de eco). (Mais técnico, áudio.)
- [ ] **JARVIS: wake word / 2 palmas** — acordar o JARVIS por voz de qualquer tela.
- [ ] **JARVIS: ampliar cobertura/confiabilidade do executor de tarefas por voz.**
- [~] **Portal do cliente externo** — **slice 1 no ar** (commit `535402e`): link público por cliente
  (`/portal?t=…`, botão "Portal do cliente" no Planejamento) onde o cliente vê o plano de conteúdo ao
  vivo e abre demanda (cai em wfa-demandas). ⚠️ testar em prod (ver PENDENCIAS). Próximas fatias:
  entregas/Drive do cliente, status das demandas pro cliente, login próprio (hoje é link/token).
- [ ] _(verificar se já saíram: botões adicionar cliente E colaborador · régua dos 15 gerar tarefas na jornada · concluir tarefa no Meu Dia)_

### Feito hoje — fora do backlog de ontem
- [x] **Squad Alpha: réplica editável da planilha** (commit `74fc6ce`) — aba Clientes › Squad Alpha,
  tabela editável (36 colunas/8 grupos), checks, flags coloridas, KPIs, export CSV, sincronizada.
  Inclui os 10 clientes Alpha (Bellato e Valhalla, que faltavam). Próximas fatias possíveis:
  abas Business Score e grids semanais (Gestor de Tráfego/Criador) da planilha original.
- [x] **UI premium** nas páginas do cliente (Aprovação + Portal) e ícones SVG no Meu Painel.

### Abertas (sugeridas hoje — track de vendas/UX)
- [ ] CRM ↔ WhatsApp · Lembrete de follow quente · Cobrança em 1 clique · Importar leads em massa
- [ ] Painel de vendas · Busca global · Dark mode · Atalhos · Templates WhatsApp · Relatório semanal

### 2026-07-28 — Sync sem piscada e sem perda (piscada branca + "adicionei e sumiu" + Error 1102)
- [x] **Piscada branca morta:** applyCloudState agora detecta mudança real e SÓ re-renderiza
  quando algo mudou de fato (antes: ~20 render* a cada 6s, app inteiro piscava e perdia foco/scroll).
- [x] **Fim do "adicionei e sumiu":** wfa-demandas, wfa-rotinas, wfa-clientes-custom e as planilhas
  Alpha (wfa-alpha, am/gt/cr) entraram em WFA_MERGE_KEYS/WFA_TOMBSTONE_KEYS (mescla por id, como
  o CRM). Deletes gravam lápide (delDem, delRot, alphaDelRow, gridDelRow, cliRemove, Bellato v2).
  Carimbo `up` automático por item mudado (wfaStampUp) em toda lista mesclável: conflito entre
  aparelhos resolve por item, edição não reverte mais.
- [x] **União volta pro servidor:** quando a mescla recupera item que o remoto não tem, o cliente
  reempurra a lista mesclada (antes o item ficava visível só num aparelho pra sempre).
- [x] **Error 1102 aliviado:** sync condicional. GET /api/workflowark/state?since=<updated_at máx>
  responde {unchanged:true} minúsculo quando nada mudou (o trigger do Postgres garante o carimbo).
  Load completo de segurança a cada 10 ticks. Bônus: fallback de load-key via app pai não vira
  mais save-state (bomba latente desarmada em app.tsx).
- Verificado: Playwright local (0 re-render em 3 aplicações idênticas, união+lápide ok), build,
  deploy manual, marcador `2026-07-28-sync-sem-piscada-sem-perda` confirmado em prod, teste
  mobile ok, 18s observados no Chrome do Gabriel sem nenhum re-render e GETs com ?since=.

### 2026-07-28 (rodada 2) — Sólido v2: fuzz 1500 ops, lápide monotônica, Kanban sem bug de cor, Comercial ao vivo
- [x] **Fuzz test do sync (funções reais):** 3 aparelhos virtuais, 1500 operações aleatórias com
  quedas de rede e flush parcial. PEGOU bug real: a lápide (wfa-deleted-ids) era last-write-wins
  no servidor e um aparelho desatualizado apagava a lápide do colega (item excluído ressuscitava).
- [x] **Fix da lápide:** servidor faz UNIÃO (save-state de wfa-deleted-ids nunca perde id) e o
  cliente reempurra a união quando percebe o servidor incompleto. Fuzz re-rodado: PASSOU
  (0 sumiços, 0 ressurreições, convergência total nos 3 aparelhos + servidor).
- [x] **Kanban x barra de rolagem:** quem rola agora é a .task-list; a coluna (faixa de cor,
  cabeçalho, cantos) fica parada. Verificado em prod com coluna rolada 400px, cores intactas.
- [x] **XSS:** escapeHtml em nome de cliente no card de tarefa e fonte/responsável no card do CRM.
- [x] **Badge Atividades explicado:** conta URGENTES (atrasadas + vencem hoje), diferente do KPI
  "Ativas" (todas não concluídas) — de propósito; tooltip no hover explica a conta.
- [x] **Comercial ao vivo:** faixa "Ao vivo · CRM" (leads novos, fechados c/ valor, pipeline aberto)
  por mês selecionado + Meta Ads do mês atual (investido, leads das campanhas, cliques) via
  integração existente, com cache de 10 min e select de conta (lembrado em wfa-comercial._metaAcc).
  Funil se alimenta do CRM quando os campos manuais estão vazios, mesma conta da faixa.
  Meta aparece assim que o token for conectado em Ferramentas › Integrações.
- [x] **/app estável:** 30 requests seguidos em prod = 30x HTTP 200, zero 1102 (pós sync condicional).
- Marcador `2026-07-28-solido-v2` verificado em prod, teste mobile OK.

### 2026-07-28 (rodada 3) — Fluido v3: render seletivo, scroll preservado, board 3x mais leve
- [x] **Render seletivo:** tarefas/CRM/demandas/rotinas/WhatsApp só reconstroem o DOM quando a
  chave DELES mudou no sync (a lápide conta). Renders leves seguem sempre. Verificado: mudança
  só em demandas = 0 re-render do Kanban.
- [x] **Scroll preservado:** re-render do Kanban mantém o scrollTop de cada coluna (200→200 no teste).
  Colega mexe em tarefa e a sua coluna não pula mais pro topo.
- [x] **Concluído enxuto:** coluna mostra as 30 concluídas mais recentes (ordenadas por conclusão)
  + botão "Mostrar todas (N)". Em prod: DOM caiu de 237 pra 30 cards, badge mantém o total real.
  content-visibility:auto nos cards (navegador só pinta o que está na tela).
- [x] **Regressão:** fuzz 800 ops / 3 aparelhos re-rodado pós-mudanças: PASSOU.
- Marcador `2026-07-28-fluido-v3` verificado em prod (curl + DOM real no Chrome), mobile OK.

### 2026-07-28 (rodada 4) — Apple v4: Desfazer, backup diário, Só minhas, FLIP, CI que se prova
- [x] **Desfazer (padrão Apple, sem caixa de confirmação):** excluir lead/demanda/rotina e concluir
  tarefa agora agem na hora e mostram toast com "Desfazer" (6,5s). Desfazer exclusão reinsere um
  clone com id novo (a lápide é monotônica de propósito). Verificado: excluir→desfazer→volta.
- [x] **Backup diário automático:** 1x/dia o servidor fotografa o estado inteiro em
  wfa-backup-<data> (14 dias de retenção, carona no load via waitUntil). Snapshots nunca descem
  pro cliente (excluídos das respostas). Restauração: Supabase Table Editor, key LIKE 'wfa-backup-%'.
  CONFERIR amanhã no painel se o primeiro snapshot apareceu.
- [x] **"Só minhas" no Kanban:** botão 👤 aplica/tira o filtro de responsável = membro logado.
- [x] **Animação FLIP:** card desliza da posição velha pra nova ao mudar de coluna (0.28s,
  respeita prefers-reduced-motion; cap 200 cards).
- [x] **CI se auto-verifica:** passo "Smoke check pós-deploy" no deploy.yml compara o marcador do
  fonte com o que a URL de produção devolve; se não bater em 3 tentativas, a action fica vermelha.
- Marcador `2026-07-28-apple-v4` em prod, mobile OK, 11/11 checks locais do pacote.

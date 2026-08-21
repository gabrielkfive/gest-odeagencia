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
15. ✅ **Segurança: painel não abre mais sem login.** `public/workflowark.html` é estático
    em `/public`, então abrir a URL direto pintava o sistema inteiro a partir das 59 chaves
    `wfa-*` do `localStorage`, sem sessão. O `signOut` do app pai limpava a sessão do
    Supabase mas não esse cache, então cobrança, CRM, financeiro e clientes continuavam
    na tela depois de sair. A API já exigia bearer token, o furo era de exibição.
    Agora: guarda síncrona no `<head>` (sem token, apaga o cache e vai pro `/auth` antes
    de qualquer paint), confirmação assíncrona no boot para token expirado, e o botão Sair
    descarrega o que está pendente antes de limpar. Se sobrar escrita não confirmada, o
    cache fica no aparelho de propósito, nunca perder dado vem primeiro, e quem protege a
    exibição é a guarda. Trancado por `deploy/teste-guarda-sessao.mjs`, que reprova a
    versão anterior. Pendência aberta em 27/07.
16. ✅ **Supabase servido de casa, não de CDN.** O `workflowark.html` carregava a biblioteca
    do Supabase de `cdn.jsdelivr.net` em versão flutuante (`@2`). Testado com o CDN
    bloqueado: dá `supabase is not defined` na linha do `createClient`, o bloco de script
    inteiro morre ali e tudo que é definido depois deixa de existir. A página continua
    visível com o menu montado, então a equipe vê um painel que parece funcionar e está
    morto, sem carregar dado, sem sincronizar, sem salvar e sem avisar. E `@2` flutuante
    significava que um release menor podia quebrar a produção sem ninguém ter feito deploy.
    Agora é `public/vendor/supabase-2.107.0.umd.js`, com a versão no nome, no mesmo padrão
    do `vendor/docx.umd.js` que já existia, e na mesma versão que o app React usa. Mais uma
    guarda: se a biblioteca não carregar por qualquer motivo, aparece um aviso claro com
    botão de recarregar, em vez do painel meio morto.
17. ✅ **Notificação lida agora atravessa de aparelho.** O sino voltava cheio no celular
    depois de você limpar no PC, mesmo com o conserto de 27/07 que dizia sincronizar. Causa:
    `wfa-notif-read` estava na lista de sync do cliente, não estava na lista de bloqueio de
    envio, e **não estava liberada no servidor**. Todo save voltava "Bloco inválido" e a fila
    do cliente descartava em silêncio, então o código de união que o cliente tinha para essa
    chave nunca rodava, porque nada conseguia escrever no servidor. Uma linha esquecida numa
    lista, semanas de sintoma, zero mensagem de erro. Agora a chave está liberada e a união é
    feita no servidor, monotônica igual à lápide de exclusão: "li" nunca vira "não li".
    Dois guardas novos para a classe inteira do problema: o descarte definitivo deixou de ser
    silencioso (registra a chave, avisa uma vez) e o Sair passa a contar essas chaves antes de
    limpar o cache, senão o logout apagaria justamente o dado que nunca subiu. Travado por
    `deploy/teste-chaves-sync.mjs`, que reprova a versão anterior apontando a chave e o
    conserto.
18. ✅ **Correção da correção: a guarda de sessão estava apagando dado que não volta.** A
    guarda do item 15 limpava TODAS as chaves `wfa-*` quando não havia sessão. Só que 25 delas
    nunca vão para a nuvem, e três guardam trabalho de verdade: `wfa-rotina-checks` (os checks
    diários de rotina), `wfa-allhands` (as narrações escritas no All Hands) e `wfa-cons-chat-*`
    (histórico de conversa do conselho por cliente). Como não existem no servidor, não voltavam
    no login seguinte. Bastava a sessão expirar de um dia para o outro e o trabalho sumia.
    Agora a limpeza atinge só o que a nuvem devolve. A lista vem publicada pelo próprio app em
    `wfa-sync-keys`, com fonte única em `WFA_CLOUD_KEYS`, então não existe segunda lista para
    sair do lugar, que é exatamente o erro do item 17. Sem a lista, não apaga nada: falha para
    o lado seguro, e quem impede a exibição continua sendo a guarda, que redireciona antes de
    qualquer paint. O `teste-guarda-sessao.mjs` passou a exigir as duas coisas ao mesmo tempo,
    cache sincronizado limpo e dado só local intacto, e reprova a versão anterior.
19. ✅ **Link de portal e de aprovação não podem mais nascer adivinháveis.** Esses links são o
    único segredo: quem tem a URL vê os dados daquele cliente sem login, e no portal o token é
    persistente, gerado uma vez e reusado para sempre. A geração tinha um plano B silencioso
    para `Date.now() + Math.random()`, que é previsível. Bastava ele disparar uma vez para
    aquele cliente ficar com um link permanente que dá para adivinhar. Agora são dois
    geradores criptográficos e, se nenhum existir, o sistema recusa gerar o link, porque link
    fraco e eterno é pior que link nenhum. Travado por `deploy/teste-segredos.mjs`, que reprova
    a versão anterior apontando as duas linhas.
20. ✅ **A ponte externa era a mais frouxa das três, agora está alinhada.** Três rotas devolvem
    estado do sistema para fora: a principal, o conector MCP e a ponte. As duas primeiras
    recusam devolver `wfa-portal-tokens` e `wfa-backup-*`. A ponte não recusava. Ou seja, ela
    aceitava devolver o mapa com o link de portal de todos os clientes de uma vez, e cada um
    desses links abre os dados daquele cliente sem login, além de fotos do estado inteiro do
    sistema. Exigia a chave da ponte, então não era buraco aberto, mas transformava uma chave
    vazada em acesso a todos os portais. As três agora usam a mesma regra, e o
    `teste-segredos.mjs` confere que continuam iguais.
21. ✅ **O webhook do WhatsApp estava aberto para qualquer um.** A verificação era "se não há
    segredo configurado, aceita". E a `WEBHOOK_SECRET` não estava configurada: conferido em
    produção em 20/08, um POST sem token e um POST com token errado responderam 200 os dois.
    Na prática, quem soubesse o endereço podia injetar mensagem falsa de cliente no sistema,
    criando tarefa, gerando notificação e disparando chamada de IA, que custa dinheiro. Agora
    é o contrário: sem segredo configurado, recusa, e devolve uma mensagem dizendo exatamente
    qual comando rodar. Nada depende disso hoje porque a Evolution está fora do ar, então
    fechar agora não quebra nada. **Quando a Evolution voltar, é preciso rodar
    `npx wrangler secret put WEBHOOK_SECRET` e pôr o mesmo valor lá no header
    `x-webhook-token`, senão as mensagens não entram.**
22. ✅ **Chave da IA e senha da banca não estão mais publicadas no GitHub.** Três coisas de uma
    vez, todas por o repositório ser público. (a) O proxy interno de IA tinha uma chave fixa
    escrita no código, usada quando o segredo não estava configurado. O segredo não estava
    configurado, então essa chave, que libera o Claude Sonnet na conta da ARK, estava
    publicada e funcionava. Conferido em produção. Removida, e agora o proxy recusa se o
    segredo faltar. (b) O diagnóstico da IA não pedia autenticação nenhuma, então qualquer um
    disparava uma chamada paga à Anthropic. Passou a exigir chave. (c) As três contas da banca
    do TCC estavam vivas em produção com a senha `ArkAvaliacao2026`, que também estava no
    código público. Testado: as três logavam. A senha saiu do código e passou a ser gerada
    forte por execução. O desligamento das contas em si (`?off=1`) foi feito por você, porque
    exige a chave de serviço. Travado por `deploy/teste-segredos.mjs`, que agora também recusa
    qualquer segredo com valor fixo no código, em qualquer rota.
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

### 2026-07-28 (rodada 5) — Badge que bate + menu sem pulo
- [x] **Badge Atividades = KPI Ativas:** o número da sidebar agora é o mesmo "Ativas" da página
  (todas as não concluídas). Gabriel estranhou 2x o "não bate"; o detalhe (atrasadas · vencem
  hoje · no prazo) foi pro tooltip. Marcador `2026-07-28-badge-ativas-v5`.
- [x] **Menu sem pulo ao expandir:** expandir a partir do "espiar" (peek) fazia a barra cair do
  overlay pro grid no 1º frame e pular/encolher durante a animação. Agora a classe .expanding
  segura o visual de overlay enquanto o grid anima por baixo e assenta no fim; peek é removido
  no toggle e o hover fica suprimido 600ms. Marcador `2026-07-28-menu-suave-v6`, mobile OK.

### 2026-07-28 (rodada 6) — Prints do Gabriel (pasta ARQUIVOS/GOOGLE/GMAIL) auditados
- [x] **"+ Adicionar cartão" por cima dos cards (print de 27/07):** morto pela reforma da rodada 3
  (lista rola dentro da coluna; o qadd ficou fora da área rolável). PROVADO em prod: lista rolada
  300px, sobreposição 0px.
- [x] **KPIs ignoravam o filtro (print de 27/07, filtro Samuel):** Ativas/Em andamento/Atrasadas/
  Concluídas hoje agora contam o MESMO conjunto filtrado das colunas quando há filtro ativo.
  Verificado: filtro Samuel = 2 ativas/1 atrasada, batendo com as colunas. Sem filtro, global.
- Marcador `2026-07-28-kpi-filtro-v7` verificado em prod.

### 2026-07-28 (rodada 7) — Atalhos de teclado
- [x] **Ctrl(Cmd)+K ou "/"** foca a busca global de qualquer lugar · **N** abre nova tarefa na aba
  Tarefas. Nunca rouba tecla de quem está digitando (input/textarea/contenteditable).
- Marcador `2026-07-28-atalhos-v8` em prod, mobile OK. Deploy manual já inclui o commit `a32b471`
  do outro computador (rebase feito antes).

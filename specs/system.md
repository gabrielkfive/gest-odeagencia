# WorkFlowArk, especificação do sistema

Atualizado em 10/09/2026. Leia junto com `CLAUDE.md` (regras de operação) e `memoria.md`
(decisões e histórico). Este arquivo descreve COMO o sistema funciona hoje, para quem vai
mexer nele sem ter lido o código inteiro.

## O que é

Hub operacional da ARK Content: tarefas (Kanban de Atividades), projetos por cliente,
jornada do cliente, CRM, financeiro, OKRs, rotinas, propostas, WhatsApp e agentes de IA.
Em produção em `https://workflowark.arkcontent.workers.dev/app`, usado todo dia pela equipe,
metade pelo celular.

## Stack real

- Servidor: TanStack Start (React 19) em Cloudflare Workers via Nitro. Rotas de API em
  `src/routes/api/`. Estado no Supabase (Postgres), tabela `workflowark_state`
  (`key text PK, data jsonb, updated_by uuid, updated_at timestamptz` com trigger que
  carimba `updated_at` em todo UPDATE). RLS travado: o navegador nunca fala com o
  Supabase direto para dados, só para autenticação; tudo passa por
  `src/routes/api/workflowark.state.ts` com a service role.
- Interface principal: `public/workflowark.html` carregado num iframe por `/app`. Desde
  06/09/2026 o monolito foi dividido em três arquivos referenciados pelo HTML:
  `workflowark-<data>.css`, `workflowark-sync-<data>.js` (sincronização) e
  `workflowark-app-<data>.js` (aplicação, ~11,6k linhas). O nome leva a data para
  invalidar cache; `public/_headers` obriga revalidação desses arquivos.
- Marcador de build: primeira linha do HTML (`<!-- build AAAAMMDD-nome -->`). O CI confere
  esse marcador na URL de produção depois do deploy, e o próprio app compara o seu com o
  do servidor para avisar "nova versão".

## Modelo de dados (chaves `wfa-*`)

O estado é um conjunto de blocos JSON, cada um numa chave `wfa-*`. O cliente guarda cada
chave no `localStorage` e a nuvem espelha a mesma chave em `workflowark_state`.

- `wfa-tarefas`: lista de tarefas do Kanban de Atividades. Campos principais: `id`,
  `title`, `desc`, `status` (`backlog | iniciar | andamento | aprovacao | homologcli |
  concluido`; `aprovacao` é rotulado "Homologação" e `homologcli` "Homologação do
  cliente"), `resp` (texto, espelho de `resps[0]`), `resps` (lista de nomes), `clienteId`,
  `prio`, `data` (AAAA-MM-DD), `ord` (posição na coluna), `checklist`, `attachments`,
  `comments`, `hist`, `timeSpent` (segundos), `timerSince` (ISO ou null), `concluidaEm`,
  `aprovacaoEm`, `up` (carimbo ISO da última alteração do item).
- `wfa-projetos`: lista de projetos por cliente. Cada projeto tem `id`, `cliente`,
  `clienteId`, `sprint`, `pront` (prontuário), `tarefas[]` (`id`, `t`, `st` com as mesmas
  colunas, sendo `homolog` a homologação interna, `resps`, `resp`, `venc`, `ini`, `horas`,
  `papeis`, `checklist`, `anexos`, `coments`, `hist`, `timeSpent`, `timerSince`, `up`) e
  `up` no projeto. Tarefa de projeto fora do backlog aparece no Kanban de Atividades como
  cartão ligado (`id` = `pj:<projId>:<taskId>`), sem cópia: mover lá muda aqui.
- `wfa-deleted-ids`: lápide. Todo id excluído (tarefa, projeto, tarefa de projeto, lead,
  etc.) entra aqui e nunca volta pela mescla. É monotônica nos dois lados.
- Demais chaves (`wfa-crm`, `wfa-demandas`, `wfa-rotinas`, `wfa-clientes-custom`,
  `wfa-alpha*`, ...) seguem o mesmo padrão de lista com `id` e `up`.
- Responsável é TEXTO (nome), não id. Nomes canônicos vivem em `TEAM_BASE` mais os
  colaboradores custom; `MIG_NOMES_CANON` e `migraNomesEquipe` corrigem dado antigo
  ("Caio" vira "Caio Neves", "Darmã" vira "Darman"). Filtros e busca comparam sem acento e
  sem caixa e aceitam o nome canônico.

## Sincronização (o coração da confiabilidade)

1. `localStorage.setItem` é interceptado: toda chave `wfa-*` escrita entra numa fila
   (`WFA_PENDING`) e fica "suja" (`WFA_DIRTY`) até o servidor confirmar. Antes de subir,
   listas mescláveis ganham carimbo `up` por item que mudou (`wfaStampUp`); em
   `wfa-projetos` o carimbo é por projeto E por tarefa.
2. `wfaFlush` envia `save-state` chave a chave. Erro transitório recoloca na fila e tenta
   no próximo tique (6 s). "Bloco inválido" é veneno: a chave sai da fila com aviso.
3. O servidor, para chaves em `CHAVES_MESCLA` (`src/lib/merge-estado.js`), NÃO grava a
   lista inteira: lê a linha atual e a lápide, mescla por item (vence o `up` mais novo; só
   um lado com `up`, esse lado; nenhum, vence quem salva), e grava com concorrência
   otimista (`UPDATE ... WHERE updated_at = lido`; zero linhas = outro save entrou, repete
   até 4 vezes). Projetos mesclam tarefa a tarefa.
4. A cada 6 s (ou ao voltar para a aba) o cliente pede `load?since=<carimbo>` e aplica o
   que mudou com `applyCloudState`, que mescla por id com a mesma regra do servidor
   (`wfaMergeById` e `wfaMergeProjetos`) e reempurra a lista quando o local tem item que
   o remoto não tem OU item mais novo. O carimbo `since` só avança quando a resposta foi
   aplicada: durante um arrasto e por 8 s depois do drop a aplicação é adiada.
5. Indicador no topo (`#sync-status`): "Salvando…" com escrita na fila, "✓ Salvo HH:MM"
   quando tudo confirmou, "⚠ Não salvou ainda · tentando de novo" em falha transitória
   (o dado fica no aparelho e sobe quando a rede voltar).
6. Invariantes trancadas por teste: toda chave que o cliente empurra está liberada em
   `STATE_KEYS` (`deploy/teste-chaves-sync.mjs`); `WFA_MERGE_KEYS` = `CHAVES_MESCLA` e
   `WFA_TOMBSTONE_KEYS` = `CHAVES_LAPIDE`, e as funções de mescla do cliente e do servidor
   dão o mesmo resultado (`deploy/teste-merge-estado.mjs`).

## Fluxo de uma tarefa

- Criar: modal genérico `wfaTaskModal` (mora no módulo Projetos, usado também por
  Atividades via `wfaTarefaModal`). Tarefa nova só nasce no botão Salvar. Toda tarefa
  nasce com o cronômetro correndo (pedido antigo do Gabriel).
- Editar: o mesmo modal. Tarefa existente tem autosave: 1,2 s depois de parar de digitar
  grava pelo mesmo caminho do botão Salvar (a tela continua aberta) e o rodapé mostra
  "Salvando… / Salvo ✓ HH:MM". Fechar (botão Fechar ou clique fora) grava o pendente.
- Mudar de coluna: arrasto (mouse ou toque) chama `taskReordena` e `saveTarefas`; o
  gate de POP pode recusar a conclusão e devolve o cartão à origem com aviso. Cartão de
  projeto (`pj:`) muda de status via `pjMoverStatus`, fonte única em `wfa-projetos`.
- Cronômetro: play/pause/zerar persistem na hora (`onTimer`) em Atividades e em Projetos;
  o contador anda ao vivo com a tela aberta; concluir a tarefa para o relógio.
- Excluir: adiciona à lápide e salva.
- Busca e filtros: `tarefaPassaFiltro` (no sync) e `globalSearch` (no app), ambos sem
  acento e sem caixa; busca olha título, descrição, responsáveis, cliente e tags.

## Arrasto (mouse e toque)

- Mouse: HTML5 drag and drop em `bindDrag`. Durante o arrasto `WFA_DRAGGING` adia
  qualquer repintada; `wfaDragFim` repinta ao soltar; timeout de 4 s destrava.
- Toque: camada própria no fim do app traduz toque em dragstart/dragover/drop (segurar
  200 ms). A rolagem automática da borda só liga depois que o dedo andou mais de 24 px,
  senão o quadro corria ao segurar o cartão perto da borda e o cartão caía na coluna
  vizinha.
- Ordem: comparador `taskCmp` (ord, prioridade, data, id) é transitivo; `taskRenumera`
  enxerga a coluna inteira mesmo com filtro.

## Testes (rodar antes de qualquer deploy)

| Comando | O que prova |
|---|---|
| `npm run build` | build passa |
| `node deploy/teste-chaves-sync.mjs` | chaves cliente x servidor |
| `npm run teste:merge` | mescla servidor = cliente, por item e por tarefa de projeto |
| `npm run teste:confiabilidade` | mover persiste após reload, homologação do cliente, busca com/sem acento, filtro Caio, autosave, cronômetro, indicador |
| `npm run teste:arrastar` | arrasto com filtro, mouse e toque (iPhone WebKit e Chrome) |
| `npm run teste:mobile` | menu lateral no celular |

O CI (`.github/workflows/deploy.yml`) faz deploy a cada push em `main`, confere o marcador
na URL e depois roda os testes acima contra o build. Testes vermelhos não derrubam o
deploy (regra nº 1), mas avisam regressão.

## O que NÃO fazer

- Não escrever `wfa-whatsapp` do cliente (é do servidor).
- Não trocar responsável de texto para id sem migrar Meu Dia, filtro e capacity juntos.
- Não usar `let`/`const` para variáveis lidas por render que pode rodar cedo na carga
  (`state`, `WFA_FILTROS`, `WFA_DRAGGING`, ...): TDZ deixa a tela branca.
- Não usar classe CSS começando com `ad` (adblock esconde).
- Não fazer deploy manual sem commit e push.

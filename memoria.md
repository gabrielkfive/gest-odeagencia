# Memória do projeto WorkFlowArk

Registro cronológico de decisões e do estado das frentes. Datas absolutas. Quem retomar
o trabalho (Claude ou Codex) lê este arquivo, o `CLAUDE.md` e `specs/system.md` antes de
mexer em qualquer coisa. O histórico detalhado de commits está no git.

## 10/09/2026, confiabilidade do Kanban (branch `fix/kanban-confiabilidade-fable`)

Contexto: Gabriel consolidou no Codex a revisão de 7 dias e pediu prioridade absoluta em
confiabilidade (Kanban, autosave, responsável, busca, cronômetro, sincronização) antes de
qualquer visual ou agente.

Descobertas (causa raiz, com prova):

1. O deploy automático estava com o job de testes pós-deploy vermelho desde 07/09 (4 pushes):
   `deploy/teste-chaves-sync.mjs` procurava `WFA_CLOUD_KEYS` no HTML, mas a fatia 2 do
   split moveu o sync para `workflowark-sync-*.js`. O deploy em si subia; os testes de
   navegador nunca rodavam. Corrigido: o teste lê o HTML mais os scripts que ele referencia.
2. Servidor gravava a lista inteira (`upsert` cego em `save-state`). Duas pessoas na mesma
   janela de 6 s: a última sobrescrevia a outra. O cliente mescla por item ao ler, mas só
   reempurrava quando faltava um id. Corrigido: mescla por item no servidor
   (`src/lib/merge-estado.js`) com concorrência otimista por `updated_at`, e o cliente
   reempurra quando tem item mais novo (comparação com JSON canônico, para não brigar com a
   ordem de chaves do jsonb).
3. `sincronizarAgora` avançava `WFA_STATE_T` antes de `applyCloudState`, que descarta a
   resposta durante o arrasto e por 8 s após o drop. Mudanças dos colegas nesse intervalo
   sumiam até o load completo de 60 s e podiam ser sobrescritas. Corrigido: o carimbo só
   avança quando a resposta foi aplicada.
4. `wfa-projetos` carimbava `up` por projeto. Duas pessoas em tarefas diferentes do mesmo
   projeto brigavam pelo projeto todo (caso da LP da Mazute que "não ficava" em homologação
   do cliente). Corrigido: carimbo por tarefa e mescla tarefa a tarefa nos dois lados; a
   exclusão de tarefa de projeto agora vai para a lápide.
5. Camada de toque: a rolagem automática da borda disparava no instante em que o dedo
   segurava um cartão a menos de 54 px da borda do quadro; o quadro rolava 208 px e o
   cartão caía na coluna vizinha. Reproduzido por instrumentação no Chrome desktop com
   toque (o teste `teste-arrastar-tarefas.mjs` falhava aqui e passava no iPhone WebKit).
   Corrigido: rolagem só depois de o dedo andar 24 px.
6. Busca (`tarefaPassaFiltro` e `globalSearch`) comparava só `toLowerCase`: "Darma" não
   achava "Darmã". E não olhava responsável. Corrigido: sem acento e sem caixa, olhando
   título, descrição, responsáveis, cliente e tags. Filtro por responsável aceita o nome
   canônico (tarefa antiga com "Caio" aparece em "Caio Neves").
7. Modal de tarefa guardava tudo até o Salvar; fechar descartava. Cronômetro de tarefa de
   projeto só persistia no Salvar e o contador não andava com a tela aberta. Corrigido:
   autosave com debounce de 1,2 s em tarefa existente, gravação ao fechar, indicador no
   rodapé, `onTimer` em Projetos, contador ao vivo. Tarefa nova continua só no Salvar.
8. O aviso de "nova versão" recarregava a página sozinho com a tela da tarefa aberta ou no
   meio de um arrasto (só olhava os modais antigos). Corrigido.
9. Cache: `_headers` só revalidava o HTML; os scripts `workflowark-*.js` podiam ficar
   velhos no navegador. Corrigido com regra de revalidação e nomes com data 20260910.

Não reproduzido, fica em observação: "cards falham ao mudar de aba". Hipótese mais
provável é a combinação dos itens 2 e 3 (a puxada ao voltar para a aba trazia foto velha ou
o carimbo pulava mudanças). O teste de confiabilidade cobre trocar de aba do sistema e
recarregar; se voltar a acontecer, anotar hora, pessoa, cartão e o texto do indicador de
sync no momento.

Concorrência de sessões: durante este trabalho outra sessão do Claude ("WorkFlowArk bugs
criticos") editava o mesmo diretório. Esta frente foi movida para o worktree
`C:\Users\USER\gest-odeagencia-fable`. O diretório principal ficou com a outra sessão.

Validação feita: build OK; `teste-chaves-sync` OK; `teste-merge-estado` 21/21;
`teste-confiabilidade` 24/24 (Chrome); `teste-arrastar` 6 cenários OK (iPhone WebKit,
Chrome desktop toque e mouse, Safari mouse); `teste:mobile` OK.

Pendente de decisão do Gabriel: merge em `main` (o push em `main` faz deploy). Nada foi
enviado para produção.
Atualização 28/09/2026: resolvido. `src/lib/merge-estado.js`, `teste:merge` e
`teste:confiabilidade` estão em `main` e as regras viraram a seção 7 do `CLAUDE.md`. O
commit do merge fica antes do começo do clone raso usado na conferência (17/09).

## Próxima fila (depois de estabilizar o sistema)

1. Fonseca & Cavalcanti: auditoria de conversão e plano de VSL.
2. Mazute: sprint pontual de ajustes e homologação.
3. Drive: inventário de assets por cliente (Gabriel mandou a pasta pública em 10/09).
4. Hermes: mapa real de integrações antes de criar agente.
5. Biblioteca ARK de prompts reutilizáveis.

## 28/09/2026, estado real

Conferência de `docs/HANDOFF-financeiro-seguranca.md`, `docs/PENDENCIAS-GABRIEL.md`,
este arquivo e `docs/plans/2026-09-22-maratona-doc11.md` contra o código e o git log.
O clone da conferência é raso (começa em 827c703, 17/09).

Resolvido (sai das listas de pendência):
- Rota `/api/workflowark/sheet` sem login: fechada. Só admin, gestor e financeiro ativos,
  ou RUN_KEY (guarda datada de 17/09, presente desde 827c703).
- Gate por papel no `state.ts`: Cobranças e Acerto desde 17/09 (827c703); matriz Ver/Editar
  da tela Equipe, extratos e acertos a receber desde 24/09 (39a0d35, 8272629).
- Conta nova fica pendente até o admin liberar (8602334, 24/09) e lote 2 de segurança
  (f7db9d1): automações só admin/gestor/financeiro, WhatsApp fecha por padrão.
- Merge da confiabilidade do Kanban de 10/09: está em `main`.

Pendente de verdade, lista única:
1. API da Anthropic desligada desde 05/09/2026 por falta de crédito. Tudo de IA no servidor
   falha (agentes, conselho, legendas, roteirista, planejamento, SDR). Ação do Gabriel:
   colocar crédito.
2. Fatura Anthropic #KXTPRBDI-0004 com lembrete de atraso até 15/08/2026. Ação do Gabriel:
   quitar (provavelmente ligada ao item 1).
3. Crédito promocional de US$ 250 das sessões na nuvem do Claude Code: resgatar até
   07/10/2026, vence em 04/11/2026 e se perde se o plano Max for cancelado. Ação do Gabriel.
4. Código: `wfa-fin` e `wfa-planilha` ainda chegam a qualquer membro ativo no GET do estado
   (faltam em `BLOCO_ABA` de `src/lib/permissoes.js`). Detalhe e correção sugerida em
   `docs/HANDOFF-financeiro-seguranca.md`.
5. Twilio para o Power Dialer: sem conta, sem código. Ação do Gabriel.
6. Testes de ponta a ponta em produção do link de aprovação e do portal do cliente (aba
   anônima). Ação do Gabriel, 1 minuto cada.
7. Preço dos planos: sem ele a landing `/conheca` fica sem seção de planos. Decisão do Gabriel.
8. Aval da prévia de tokens do /app (tarefa 06 do doc 11); 93d6aca não está em `main`.
9. Canal de WhatsApp: Evolution fora desde 06/09 e número comercial banido em 10/09.
   Decisão do Gabriel (número novo ou API oficial da Meta).
10. Cadastro self-service multi-agência (tarefa 03): fora de escopo por enquanto.
11. Próxima fila de clientes e agentes (seção acima): Fonseca & Cavalcanti, Mazute, Drive,
    Hermes, biblioteca de prompts. Nenhum item consta como feito no git.
12. Em observação desde 10/09: "cards falham ao mudar de aba", sem nova ocorrência
    registrada nos docs.

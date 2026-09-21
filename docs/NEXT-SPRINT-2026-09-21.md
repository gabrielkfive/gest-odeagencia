# WorkFlowArk Next, sprint de 21 a 25/09/2026 (proposta para aprovação do Gabriel)

Escrito em 20/09/2026 a partir de `04-DIRECAO-FINAL-LANDING-SPRINT.md`, `EXECUTE-AGORA-CLAUDE.md`,
`05-MATRIZ-AGENCYFLOW.md`, `docs/MELHORIAS.md`, `memoria.md`, `specs/system.md` e do código em
`feat/next` (commit `841df43`, marcador `next-20260920a`). É proposta. Ninguém foi avisado, nenhuma
reunião foi criada, nenhuma mensagem foi enviada. Vale depois que o Gabriel aprovar e ajustar
donos e datas à disponibilidade real da equipe.

## 1. Objetivo da sprint

Colocar o `/next` em condição de uso real pela equipe nas áreas que já têm dado (Meu Dia, Comercial,
Clientes, Aprovações, Financeiro por papel, Equipe), com ponte para o clássico onde ainda não há
tela própria. Entregar a landing `/conheca` em preview, com formulário ligado ao destino que o
Gabriel confirmar, pronta para publicação autorizada na sexta.

Frentes:

- Frente A, produto `/next` (rota já no ar com Meu Dia V2 e casca de 11 áreas, commit `841df43`).
- Frente B, landing de venda `/conheca` e endpoint de lead (em execução por agentes, ainda fora do repo em 20/09).
- Frente C, conteúdo e benchmark (matriz AgencyFlow pronta em `05-`; Modo Criador `06-` não existe como documento em 20/09, só as capturas em `modo-criador/`).

## 2. Estado de partida (20/09/2026, lido do repo)

| Item | Estado |
|---|---|
| Branch | `feat/next`, base `main` em `d459138` |
| Último commit | `841df43` "Next: cópia do WorkFlowArk em /next com Meu Dia V2 e sidebar por trabalho, marcador next-20260920a" |
| Arquivos modificados sem commit | `src/routes/_authenticated/next.tsx`, `src/components/next/dados.ts`, `src/components/next/areas/comercial.tsx`, `deploy/teste-next.mjs`, `src/routes/_authenticated/meu-dia.tsx` (mudança humana, preservar), `deploy/prova-filtros-estreito.png` |
| Áreas em `AREAS` (`src/components/next/contexto.tsx`) | Meu Dia, Comercial, Clientes, Produção, Aprovações, Calendário, Financeiro, Equipe, Relatórios, Automações, Hermes, Configurações |
| Áreas com conteúdo real | Meu Dia (`next/index.tsx`) e Comercial (`areas/comercial.tsx`); as outras são casca de 669 a 690 bytes |
| Landing `/conheca` | Não existe no repo em 20/09. Em execução por agentes |
| Endpoint de lead | Não existe no repo em 20/09. Em execução por agentes. Hoje lead entra por MCP `create_lead` (source padrão "Agentes locais") e por `workflowark.sdr.ts` |
| Testes existentes | `npm run build`, `npm run teste:merge`, `node deploy/teste-chaves-sync.mjs`, `node deploy/teste-next.mjs` (não está no `package.json`), `npm run teste:mobile`, `teste:confiabilidade`, `teste:arrastar`, `teste:apple`, `teste:tema` |
| Deploy | Push em `main` dispara `.github/workflows/deploy.yml` (deploy, smoke check do marcador, testes) |

## 3. Pessoas e papéis usados neste documento

Nomes vêm de `TEAM_BASE` (`public/workflowark-app-20260914a.js`, linha 272) e os papéis do que a
memória do projeto registra. Onde não há evidência de papel, está marcado "a definir pelo Gabriel".

| Pessoa | Papel com evidência | Uso proposto na sprint |
|---|---|---|
| Gabriel Andrade | Dono, CEO, decisor de produto e de publicação | Aprova escopo, decide destino do lead, autoriza cada lote publicado |
| Caio Neves | PO, gestão de projetos (organograma set/26, modelo de projetos por cliente) | Acompanha previsto x entregue; testa Produção e Aprovações como usuário |
| Saulo | Comercial, BDR (organograma; WhatsApp dele nas propostas) | Revisa copy e oferta da landing; testa Comercial no `/next` |
| Danilo de Lima | COO, operação e pessoas (organograma abr/26) | Testa Equipe e Produção como usuário; confirma regra de carga |
| Lucas Rosi | Head de Account e CS (organograma abr/26) | Testa Clientes e sinal de saúde; valida razões do sinal com a carteira real |
| Darman | Design, roteiro e planejamento, PJ desde 01/09/2026 | Testa Aprovações do lado de quem produz a peça |
| Bruno, M. Portela, Maria Luiza, Guilherme, Omar, Kaique e demais | Papéis do organograma abr/26 (marketing, arte, social, tráfego, captação, edição) | Uso no celular durante a sprint; sem entrega atribuída |
| Dev revisor humano | Sem evidência no repo ou na memória de dev humano além do Gabriel; código é escrito por agentes | A definir pelo Gabriel. Enquanto não houver, a revisão técnica fica "pendente", sem fingir conclusão |
| Agentes (Claude) | Implementação, testes e documentação | Dono de execução em todas as entregas de código |

## 4. Entregas

Status possíveis: planejado, em execução, em revisão, aprovado, publicado, bloqueado. "Aprovado"
não é "publicado". Prazo é o dia proposto de entrada em revisão. IDs de gap referem-se a `05-MATRIZ-AGENCYFLOW.md`.

### Frente A, produto `/next`

| ID | Objetivo | Dono | Revisor | Prazo | Depende de | Critério de aceite | Status | Evidência esperada |
|---|---|---|---|---|---|---|---|---|
| NX-001 | Baseline: congelar commit base, listar arquivos compartilhados (`next.tsx`, `dados.ts`, `state.ts`, manifesto) com um dono por vez, registrar a fronteira das mudanças humanas em `meu-dia.tsx` | Agentes | Gabriel | Seg 21/09 | Nada | Tabela de arquivo x dono publicada neste documento (seção 6); `git status` limpo ou com mudanças explicadas | planejado | Seção 6 preenchida; hash do commit base |
| NX-002 | Meu Dia V2: ordenação por prazo e prioridade, bloco "Equipe hoje", contador nos títulos (GAP-001) | Agentes | Caio Neves (uso), dev revisor a definir | Ter 22/09 | NX-001 | Concluir pelo resumo, recarregar, a mesma tarefa (mesmo id) aparece concluída no Kanban clássico e some do resumo; ordenação mantida na sessão | em execução | `/next`; `node deploy/teste-next.mjs` verde; capturas `deploy/prova-next-*.png` desktop e 390 px |
| NX-003 | Comercial: pipeline, ganho e perdido com recorrente e avulso separados e origem do lead; totais somam exatamente os cartões filtrados (GAP-008) | Agentes | Saulo (uso), dev revisor a definir | Ter 22/09 | NX-001; decisão sobre campos `valorMensal`, `valorAvulso`, `origem` em `wfa-crm` | KPI do topo bate com a soma dos cartões visíveis; lead sem valor conta zero e aparece marcado | em execução | `/next/comercial`; teste em `teste-next.mjs` com semente sintética |
| NX-004 | Clientes: lista com coluna "Sinal" e razões em texto, portando `clienteSaudeReasons` para função pura em `dados.ts` (GAP-004) | Agentes | Lucas Rosi (razões), dev revisor a definir | Qua 23/09 | NX-001 | Para o mesmo estado, `/next/clientes` e a lista do clássico apontam os mesmos clientes com as mesmas razões; cliente sem dado mostra "sem sinal", não "saudável" | em execução | `/next/clientes`; teste unitário da função pura com 3 cenários |
| NX-005 | Ficha do cliente `/next/clientes/$id`: Visão, Tarefas por `clienteId`, Projetos, Aprovações, Portal, Briefing, Financeiro por papel (GAP-005), só leitura | Agentes | Lucas Rosi, Gabriel (o que cada papel vê) | Qua 23/09 | NX-004 | Ficha mostra as mesmas tarefas que o filtro por cliente no Kanban; nenhuma tarefa de outro cliente por coincidência de nome | planejado | Rota nova; captura; teste de contagem tarefa x filtro |
| NX-006 | Aprovações: lista por cliente com versão, validade, status e revogação; `create-approval` grava `versao`, `expiraEm`, `revogado`; POST recusa expirado, revogado ou substituído com 410 (GAP-002) | Agentes | Darman (uso), Gabriel (regra de versão), dev revisor a definir | Qua 23/09 | NX-001; dono único de `state.ts` neste lote | Aprovação na versão 1 não vale na versão 2; link revogado devolve 410 com texto na página; decisão depois de "approved" só se a equipe reabrir | planejado | `/next/aprovacoes`; teste de API com token válido, expirado e revogado; captura da página pública |
| NX-007 | Financeiro do mês por papel: mês e ano, seis KPIs, recorrente x pontual, atrasados de `wfa-cobranca`; API não devolve os blocos a quem não pode (GAP-009, GAP-010) | Agentes | Gabriel (papéis), dev revisor a definir | Qui 24/09 | NX-001; regra de papel já existente em `podeVerBloco` (`state.ts`) | Total do mês no V2 bate com a página clássica para o mesmo mês; membro sem papel financeiro não recebe os números na resposta da API | planejado | `/next/financeiro`; comparação automatizada de totais para um mês fixo; teste de autorização |
| NX-008 | Equipe por carga: abertas, atrasadas, concluídas no mês e `timeSpent` por pessoa, com reatribuição gravando item único (GAP-011) | Agentes | Danilo de Lima (uso), dev revisor a definir | Qui 24/09 | NX-001 | Reatribuir no V2 muda o responsável no Kanban clássico sem duplicar; contagem por pessoa igual à de `/inteligencia` | planejado | `/next/equipe`; teste de reatribuição com `up` por item |
| NX-009 | Casca das demais áreas (Produção, Calendário, Relatórios, Automações, Hermes, Configurações): leitura real onde já há chave, senão atalho explícito para o clássico; tabela de correspondência `data-nav` legado para V2 dentro de `contexto.tsx` (GAP-007) | Agentes | Caio Neves (uso), dev revisor a definir | Ter 22/09 | NX-001 | Todo `data-nav` do clássico tem destino registrado; nenhuma área abre em branco; no celular a sidebar começa fechada, abre pelo menu e fecha pela seta | em execução | `/next/$area` das 11 áreas sem tela branca (já coberto por `teste-next.mjs`); `npm run teste:mobile` verde |
| NX-010 | Estados completos em todas as áreas: carregando, vazio, erro mantendo última leitura boa, sem permissão | Agentes | dev revisor a definir | Qui 24/09 | NX-002 a NX-009 | Cada área com os 4 estados reproduzidos na semente sintética | planejado | Cenários adicionados em `teste-next.mjs` |
| NX-011 | QA do lote A: build, `teste:merge`, `teste-chaves-sync`, `teste-next`, `teste:mobile`, e `teste:confiabilidade` se tocar o clássico; correções dos achados | Agentes | Gabriel | Qui 24/09 | NX-002 a NX-010 | Todos verdes no mesmo commit; achados corrigidos ou listados como pendência | planejado | Saída dos comandos colada em `memoria.md`; hash do commit |
| NX-012 | Demonstração do `/next` à equipe e decisão de release do lote A | Gabriel | Equipe presente | Sex 25/09 | NX-011 | Gabriel decide: publica, publica parcial ou segura. Registro da decisão em `memoria.md` | planejado | Nota de decisão com hash e marcador de build |

### Frente B, landing de venda

| ID | Objetivo | Dono | Revisor | Prazo | Depende de | Critério de aceite | Status | Evidência esperada |
|---|---|---|---|---|---|---|---|---|
| NX-020 | Landing `/conheca` em preview: hero "Sua agência inteira. No mesmo fluxo.", CTA "Conhecer o WorkFlowArk", demonstração com dado anonimizado, fluxo comercial para resultado, benefícios por papel, Hermes só com o que já executa, prova real ou omissão, oferta só se confirmada, FAQ, CTA final | Agentes | Gabriel (produto), Saulo (comercial) | Ter 22/09 | Nada de código; assets `public/ark-logo.png` e `public/ark-mark.png` | Nenhum preço, depoimento, contador ou logo inventado; mockup identificado como mockup; identidade ARK, sem roxo do concorrente | em execução | Rota `/conheca` em preview; capturas desktop e 390 px |
| NX-021 | Endpoint de lead: valida, trata envio e erro, grava em `wfa-crm` com `source` "Site /conheca"; enquanto o destino não for confirmado, a página mostra "modo de demonstração" e não coleta contato real | Agentes | dev revisor a definir | Ter 22/09 | Decisão D1 do Gabriel (destino do lead) | Envio real cria um lead único em `wfa-crm` com `source` correto; erro aparece para quem envia; sem sucesso fictício | em execução | Teste de API; lead de teste identificado e removido depois |
| NX-022 | Copy revisada e verdade das promessas: cada afirmação da landing aponta uma capacidade existente no código ou está marcada "em desenvolvimento" | Saulo (proposta) | Gabriel | Qua 23/09 | NX-020 | Lista afirmação x evidência (rota ou chave) anexada; nenhuma promessa de economia não medida | planejado | Tabela de afirmações em `docs/` ou no próprio commit |
| NX-023 | Aceite técnico: mobile e desktop, acessibilidade essencial (foco, contraste, rótulos), links, SEO básico (title, description, og), imagens otimizadas, performance medida | Agentes | dev revisor a definir | Qui 24/09 | NX-020, NX-021 | Lighthouse ou equivalente registrado; sem link quebrado; formulário navegável por teclado | planejado | Relatório de performance com número e data; capturas |
| NX-024 | Publicação autorizada da landing (só depois da decisão D2) | Gabriel decide; agentes executam | Gabriel | Sex 25/09 | NX-022, NX-023, D1, D2 | URL de produção responde com o marcador da versão aprovada; formulário testado em produção com lead de teste depois removido | planejado | URL, marcador, captura, lead de teste no CRM e sua remoção |

### Frente C, conteúdo e benchmark

| ID | Objetivo | Dono | Revisor | Prazo | Depende de | Critério de aceite | Status | Evidência esperada |
|---|---|---|---|---|---|---|---|---|
| NX-030 | Matriz AgencyFlow (`05-MATRIZ-AGENCYFLOW.md`): usar como fonte dos gaps P1 desta sprint | Agentes | Gabriel | Feito em 20/09 | Nada | Cada entrega da frente A cita o GAP correspondente | concluído | Este documento |
| NX-031 | Modo Criador (`06-`): confirmar se o documento vai existir; em 20/09 só há capturas `modo-criador/v1-*.png` e `v2-*.png` | Gabriel decide | Gabriel | Seg 21/09 | Nada | Decisão registrada: escrever, adiar ou descartar. Não bloqueia A nem B | a confirmar | Nota em `memoria.md` |
| NX-032 | Documentação viva: `docs/MELHORIAS.md` com os itens da sprint, `memoria.md` com decisões e testes, `specs/system.md` se mudar o modelo de dados (chave nova entra em `WFA_CLOUD_KEYS`, `STATE_KEYS` e regras de mescla) | Agentes | Gabriel | Sex 25/09 | NX-011 | Nenhuma chave nova sem os três lugares; `teste-chaves-sync` verde | planejado | Diff dos três arquivos no commit |
| NX-033 | All Hands de 30/09: pauta e painel de métricas (proposta) | Agentes | Gabriel | Feito em 20/09 | Nada | Cada métrica com definição, fórmula, fonte, período e campo de valor vazio | concluído | `docs/NEXT-ALLHANDS-2026-09-30.md` |

## 5. Ritual por dia (proposta, sem reunião criada)

| Dia | Foco | Entregas do dia | Saída verificável |
|---|---|---|---|
| Seg 21/09 | Baseline e escopo | NX-001, NX-031; confirmar donos e disponibilidade; Gabriel decide D1 (destino do lead) se possível | Seção 6 preenchida; lista de decisões com data |
| Ter 22/09 | Implementação, lote 1 | NX-002, NX-003, NX-009, NX-020, NX-021 | Commits pequenos na `feat/next`; `teste-next` e `build` verdes a cada commit |
| Qua 23/09 | Implementação, lote 2 | NX-004, NX-005, NX-006, NX-022 | Idem; revisão humana em lotes pequenos, um arquivo compartilhado por vez |
| Qui 24/09 | Revisão em lotes e QA | NX-007, NX-008, NX-010, NX-011, NX-023 | Todos os testes obrigatórios verdes no mesmo commit; achados corrigidos ou listados |
| Sex 25/09 | Demonstração e release autorizado | NX-012, NX-024, NX-032 | Decisão do Gabriel registrada; se autorizado, merge em `main` e verificação da URL de produção pelo marcador de build |

Nada aqui cria evento na agenda nem manda mensagem. Se o Gabriel quiser uma demonstração formal
na sexta, ele marca.

## 6. Regras da sprint

1. "Aprovado" não é "publicado". Entrega só vira "publicado" depois de merge em `main`, deploy
   pelo CI e verificação do marcador na URL de produção (`https://workflowark.arkcontent.workers.dev`).
2. Push em `main` faz deploy. Nada é testado por publicação direta. Trabalho fica em `feat/next`
   até o Gabriel autorizar o lote.
3. Testes obrigatórios antes de pedir revisão e antes de qualquer merge: `npm run build`,
   `npm run teste:merge`, `node deploy/teste-chaves-sync.mjs`, `node deploy/teste-next.mjs`.
   Quando tocar o clássico (`public/workflowark*.js`, `workflowark.html`, `state.ts` em bloco
   compartilhado): `npm run teste:mobile` e `npm run teste:confiabilidade` também.
4. Um dono por vez para arquivos compartilhados. Quem pega o arquivo registra aqui e devolve.

| Arquivo compartilhado | Dono no lote | Devolvido em |
|---|---|---|
| `src/routes/_authenticated/next.tsx` | a preencher na segunda | |
| `src/components/next/contexto.tsx` | a preencher | |
| `src/components/next/dados.ts` | a preencher | |
| `src/routes/api/workflowark.state.ts` | a preencher (NX-006 e NX-007 dependem) | |
| `package.json` e `package-lock.json` | a preencher | |
| `src/routes/_authenticated/meu-dia.tsx` | mudança humana em andamento, ninguém toca sem o Gabriel | |

5. Chave `wfa-*` nova entra em três lugares (`WFA_CLOUD_KEYS`, `STATE_KEYS`, regras de mescla), senão
   o save volta "Bloco inválido" em silêncio (caso do item 17 de `MELHORIAS.md`).
6. Nenhum dado falso em produção. Semente sintética só em teste local (`teste-next.mjs` já barra rede externa).
7. Não prometer módulo que não existe. Landing e `/next` só mostram o que o código faz hoje; o resto
   fica marcado "em desenvolvimento" ou some.
8. Revisão técnica humana indisponível fica registrada como "pendente". Não paralisa frentes
   independentes e não é marcada como feita.

## 7. Quadro de acompanhamento da liderança (preencher durante a semana)

### Previsto x entregue

| Dia | Previsto (IDs) | Entregue (IDs, hash) | Em revisão | Bloqueado (motivo, dono) |
|---|---|---|---|---|
| Seg 21/09 | NX-001, NX-031 | | | |
| Ter 22/09 | NX-002, NX-003, NX-009, NX-020, NX-021 | | | |
| Qua 23/09 | NX-004, NX-005, NX-006, NX-022 | | | |
| Qui 24/09 | NX-007, NX-008, NX-010, NX-011, NX-023 | | | |
| Sex 25/09 | NX-012, NX-024, NX-032 | | | |

### Revisões pendentes

| ID | Aguardando quem | Desde | Observação |
|---|---|---|---|
| | | | |

### Decisões que só o Gabriel toma

| Código | Decisão | Por que só ele | Precisa até | Decidido em |
|---|---|---|---|---|
| D1 | Destino do lead da landing: só `wfa-crm` com `source` "Site /conheca", ou também WhatsApp (de quem), e-mail (qual) ou os dois. Nenhum endereço será inventado | Define para onde vai contato de cliente potencial | Seg 21/09 (destrava NX-021) | |
| D2 | Autorização de publicação de cada lote: lote A (`/next`), lote B (landing), separados ou juntos | Push em `main` é produção usada pela equipe todo dia | Sex 25/09 | |
| D3 | Quem revisa código (dev humano) ou aceite de que a revisão técnica fica pendente nesta sprint | Não há evidência de outro dev no repo | Seg 21/09 | |
| D4 | O que cada papel vê no Financeiro do `/next` (hoje: cobrança para admin, gestor, financeiro; acerto só admin, mais liberação manual em `permissions.nav`) | Regra de acesso a dinheiro | Qua 23/09 (destrava NX-007) | |
| D5 | Regra de versão da aprovação: nova versão invalida a anterior; validade padrão de 30 dias | Muda como o cliente aprova peça | Qua 23/09 (destrava NX-006) | |
| D6 | Sinal de saúde do cliente inclui atraso de cobrança como razão | Mistura CS com financeiro | Qua 23/09 (NX-004) | |
| D7 | Campos novos no lead (`valorMensal`, `valorAvulso`, `origem`) ou manter só `val` e `source` | Muda o modelo de `wfa-crm` | Ter 22/09 (NX-003) | |
| D8 | Modo Criador (`06-`): escrever, adiar ou descartar | Escopo de conteúdo | Seg 21/09 | |

### Vencimentos próximos fora da sprint (para não esquecer)

- 30/09/2026: All Hands de fechamento (proposta em `docs/NEXT-ALLHANDS-2026-09-30.md`).
- 10/10/2026: fechamento do combinado do Darman por relatório de entregas (memória `darman-caruso-combinado-setembro26`).
- Pendências antigas do Gabriel em `docs/PENDENCIAS-GABRIEL.md`: Twilio, testar aprovação por link e portal em produção.

## 8. Riscos e recuperação

| Risco | Sinal | Mitigação | Recuperação |
|---|---|---|---|
| Arquivo compartilhado editado por dois agentes ao mesmo tempo (`next.tsx`, `dados.ts`, `state.ts`) | Conflito de merge ou tela branca no `/next` | Um dono por vez (seção 6); commits pequenos | `git revert` do commit que quebrou; `teste-next` aponta a área |
| Merge em `main` sem autorização | Deploy inesperado, marcador de build muda em produção | Trabalho só em `feat/next`; merge só após D2 | `git revert <hash>` em `main` e push: o CI faz o deploy do revert; conferir marcador na URL |
| Chave nova sem os três registros | Save volta "Bloco inválido"; dado some entre aparelhos | `teste-chaves-sync` obrigatório | Adicionar a chave nos três lugares e reenviar; dado fica no aparelho até subir |
| Sidebar presa no celular (já aconteceu em jul/26) | Menu não fecha em 390 px | `teste:mobile` a cada mudança de sidebar | Revert do commit da sidebar |
| Landing publica promessa que o produto não faz | Reclamação de cliente ou da equipe | NX-022 (tabela afirmação x evidência) antes de NX-024 | Editar copy e republicar; marcador novo |
| Formulário coleta contato sem destino confirmado | Lead entra em lugar nenhum | Modo de demonstração até D1 | Desligar envio real; avisar quem enviou, se houver registro |
| Regressão no clássico por mudança em `state.ts` | `teste:confiabilidade` vermelho | Rodar antes do merge quando tocar o bloco | Revert; o bloco financeiro por papel tem teste próprio |
| Revisor humano indisponível | Fila de "em revisão" cresce | Registrar como pendente; não fingir aprovação | Gabriel decide D3 |

Marcador de versão: primeira linha de `public/workflowark.html` (`<!-- build AAAAMMDD-nome -->`) e o
marcador do `/next` (`next-20260920a` hoje). O CI compara o marcador do fonte com o que a URL
devolve; se não bater em 3 tentativas a action fica vermelha. Toda evidência de "publicado" cita o
marcador lido da URL, não o comando que rodou.

## 9. O que fica fora desta sprint (visível, não prometido)

Do backlog macro (`05-MATRIZ-AGENCYFLOW.md`, `docs/MELHORIAS.md`): prévia por formato na aprovação
(GAP-003), entregas contratadas x feitas no portal (GAP-006), automações com histórico de execução
(GAP-012, depende de confirmar onde as rotinas rodam), perguntar ao JARVIS no V2 (GAP-013), chat por
cliente (GAP-014), contratos em chave sincronizada (GAP-015), datas do mês (GAP-016), NPS (GAP-020),
busca global no V2 (GAP-021), Power Dialer (aguarda Twilio), integrações listadas em
`docs/O-QUE-O-GABRIEL-PRECISA.md`.

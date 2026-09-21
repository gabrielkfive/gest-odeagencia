# All Hands de fechamento de setembro/2026, 30/09/2026 (proposta de pauta e painel)

Escrito em 20/09/2026. É proposta: data sujeita ao calendário da equipe, sem convite criado e sem
mensagem enviada. Nenhum número está preenchido de propósito. Cada valor sai da fonte indicada, com
data de corte registrada. Falta de dado aparece como "sem dado" ou "sem registro", nunca como zero.

## 1. Snapshot

| Campo | Valor |
|---|---|
| Período medido | 01/09/2026 a 30/09/2026 |
| Período de comparação | 01/08/2026 a 31/08/2026 |
| Data e hora de corte | preencher (ex.: 30/09/2026 08:00, America/Sao_Paulo) |
| Fonte principal | tabela `workflowark_state` (chaves `wfa-*`) lida por `GET /api/workflowark/state` com sessão de admin, ou pelo Supabase Table Editor |
| Fontes secundárias | GitHub (`gh run list`, `git log`), rotas `/inteligencia`, `/agentes`, `/next` |
| Cobertura | listar aqui o que faltou: chave vazia, campo ausente, papel sem acesso |
| Quem tirou o snapshot | preencher |

Regras de leitura, valem para todas as métricas:

- Timestamp que não existe aparece como lacuna, não é estimado.
- Comparação só entre períodos equivalentes: setembro inteiro contra agosto inteiro. Outubro parcial não entra.
- Cada indicador deve permitir abrir os registros de origem (a lista de ids ou a chave) para quem tem papel.
- Replanejamento de prazo não some: se o prazo (`data`) foi alterado no mês, contar pelo prazo vigente na data de corte e registrar quantas tarefas tiveram prazo alterado, quando houver como saber (o Kanban de Atividades não guarda histórico de alteração de `data`; tarefa de projeto guarda `hist` só de status).

## 2. Painel de métricas

Formato de cada métrica: nome, definição exata, fórmula, fonte, período, comparação, dono da
leitura, valor. O campo "valor" fica vazio: preencher a partir da fonte, falta de dado não vira zero.

### 2.1 Entregas concluídas e pontualidade

| Campo | Conteúdo |
|---|---|
| Nome | Entregas concluídas no mês |
| Definição | Tarefas de `wfa-tarefas` com `status = "concluido"` e `concluidaEm` dentro do período. Tarefa de projeto (`wfa-projetos[].tarefas[]`, `st = "concluido"`) entra separada, sem contar duas vezes o cartão ligado `pj:<projId>:<taskId>` |
| Fórmula | `concluidas = count(t.status == "concluido" && "2026-09-01" <= t.concluidaEm[0:10] <= "2026-09-30")` |
| Fonte | `wfa-tarefas` (campos `status`, `concluidaEm`), `wfa-projetos` (campos `st`, `fim` quando existir) |
| Período | 01/09 a 30/09/2026 |
| Comparação | 01/08 a 31/08/2026, mesma fórmula |
| Dono da leitura | Caio Neves (proposta) |
| Valor setembro | preencher a partir da fonte, falta de dado não vira zero |
| Valor agosto | preencher a partir da fonte, falta de dado não vira zero |
| Lacuna conhecida | Tarefa concluída sem `concluidaEm` (concluída antes do campo existir ou por caminho antigo) entra em "concluídas sem data" e é listada à parte |

| Campo | Conteúdo |
|---|---|
| Nome | Pontualidade |
| Definição | Entre as concluídas do mês que têm prazo (`data` preenchida), quantas foram concluídas até o prazo |
| Fórmula | `no_prazo = count(concluidas && t.data && t.concluidaEm[0:10] <= t.data)`; `pontualidade = no_prazo / count(concluidas && t.data)` |
| Fonte | `wfa-tarefas` (`data`, `concluidaEm`) |
| Período | 01/09 a 30/09/2026 |
| Comparação | agosto/2026 |
| Dono da leitura | Caio Neves (proposta) |
| Valor setembro | preencher a partir da fonte, falta de dado não vira zero |
| Valor agosto | preencher a partir da fonte, falta de dado não vira zero |
| Lacuna conhecida | Tarefas sem `data` não entram no denominador; informar quantas são |

| Campo | Conteúdo |
|---|---|
| Nome | Atrasadas abertas na data de corte |
| Definição | Tarefas não concluídas com `data` anterior à data de corte (mesma regra do Meu Dia V2: `t.data < hoje`) |
| Fórmula | `atrasadas = count(t.status != "concluido" && t.data && t.data < corte)` |
| Fonte | `wfa-tarefas`; `/next` mostra o mesmo número em "Atrasadas" |
| Período | foto na data de corte |
| Comparação | foto em 31/08/2026 se houver backup `wfa-backup-2026-08-31` (retenção de 14 dias, provavelmente já expirado; se não houver, "sem base") |
| Dono da leitura | Caio Neves (proposta) |
| Valor | preencher a partir da fonte, falta de dado não vira zero |

### 2.2 Ciclo médio

| Campo | Conteúdo |
|---|---|
| Nome | Tempo de ciclo |
| Definição | Dias entre criação e conclusão das tarefas concluídas no mês que têm os dois carimbos |
| Fórmula | `ciclo_dias = (concluidaEm - criadaEm) / 86400000` por tarefa; informar mediana e média separadas |
| Fonte | `wfa-tarefas` (`criadaEm`, `concluidaEm`) |
| Período | concluídas entre 01/09 e 30/09/2026 |
| Comparação | agosto/2026 |
| Dono da leitura | Caio Neves (proposta) |
| Valor setembro (mediana, média, n) | preencher a partir da fonte, falta de dado não vira zero |
| Valor agosto (mediana, média, n) | preencher a partir da fonte, falta de dado não vira zero |
| Lacuna conhecida | `criadaEm` só existe em tarefas criadas por caminhos que gravam o campo (25 pontos de criação no app gravam; a criação rápida por cliente `cli<timestamp>` e a de onboarding `onb<timestamp>` não). Não usar o número do `id` como data. Informar `n sem criadaEm` |

| Campo | Conteúdo |
|---|---|
| Nome | Espera em homologação |
| Definição | Dias entre entrar em Homologação (`aprovacaoEm`) e concluir, para tarefas concluídas no mês que passaram por homologação |
| Fórmula | `espera = (concluidaEm - aprovacaoEm) / 86400000`; mediana |
| Fonte | `wfa-tarefas` (`aprovacaoEm`, `concluidaEm`) |
| Período | setembro/2026 |
| Comparação | agosto/2026 |
| Dono da leitura | Caio Neves (proposta) |
| Valor | preencher a partir da fonte, falta de dado não vira zero |
| Lacuna conhecida | `aprovacaoEm` é apagado quando a tarefa sai de Homologação sem concluir (`taskStampSt`), então tarefa que voltou perde o carimbo |

### 2.3 Retrabalho (não há campo; proxy a validar)

| Campo | Conteúdo |
|---|---|
| Nome | Retrabalho (proxy) |
| Definição | Não existe campo de retrabalho no sistema. Proxy proposto: tarefa que saiu de Homologação (`aprovacao`) ou Homologação do cliente (`homologcli`) e voltou para uma coluna anterior (`iniciar`, `andamento`, `backlog`) |
| Fórmula | Tarefas de projeto: contar em `hist[]` sequências em que um registro "mudou o status para Homologação" ou "Homologação do cliente" é seguido por "mudou o status para" uma coluna anterior. Kanban de Atividades: sem histórico de coluna (`moveTask` não grava `hist`); só é possível contar tarefas abertas hoje com `aprovacaoEm` nulo que tiveram `aprovacaoEm` no backup diário, se o backup existir |
| Fonte | `wfa-projetos[].tarefas[].hist` (texto "mudou o status para ..."); `wfa-backup-<data>` para Atividades |
| Período | setembro/2026 |
| Comparação | agosto/2026 só para projetos (o `hist` fica na tarefa) |
| Dono da leitura | Caio Neves (proposta), validar com Gabriel |
| Valor | preencher a partir da fonte, falta de dado não vira zero |
| Status do indicador | a validar. Não apresentar como taxa de retrabalho; apresentar como "voltas de homologação em tarefas de projeto". Motivo da volta não é registrado; se quiser motivo, precisa de campo novo (decisão para o próximo ciclo) |

### 2.4 Capacidade

| Campo | Conteúdo |
|---|---|
| Nome | Abertas por responsável |
| Definição | Tarefas não concluídas na data de corte, por pessoa. Responsável é texto (`resps[]`, espelho em `resp`); nomes antigos passam por `MIG_NOMES_CANON`. Tarefa com mais de um responsável conta para cada um |
| Fórmula | `abertas[p] = count(t.status != "concluido" && p in t.resps)`; junto: `atrasadas[p]` (mesma regra de 2.1) e `concluidas_mes[p]` |
| Fonte | `wfa-tarefas`; `/inteligencia` já calcula por demandado e serve de conferência |
| Período | foto na data de corte; concluídas no mês |
| Comparação | agosto/2026 só para concluídas por pessoa; a foto de abertas de 31/08 depende de backup |
| Dono da leitura | Danilo de Lima (proposta) |
| Valor | preencher a partir da fonte, falta de dado não vira zero |
| Lacuna conhecida | Não existem horas de disponibilidade nem estimativa por tarefa. `timeSpent` (segundos do cronômetro) existe e pode ser somado por pessoa, mas mede tempo cronometrado, não capacidade. Não inferir produtividade por número de tarefas |

### 2.5 Pendências por cliente

| Campo | Conteúdo |
|---|---|
| Nome | Abertas e atrasadas por cliente |
| Definição | Tarefas não concluídas agrupadas por `clienteId`; atrasadas pela regra de 2.1. Tarefa sem `clienteId` entra em "sem cliente" (o vínculo por nome no título é frágil e não deve ser usado para o painel) |
| Fórmula | `abertas[c] = count(t.status != "concluido" && t.clienteId == c)`; `atrasadas[c]` idem com `t.data < corte` |
| Fonte | `wfa-tarefas`; nomes em `wfa-clientes-custom` mais a base fixa; sinal de saúde em `clienteSaudeReasons` (clássico) |
| Período | foto na data de corte |
| Comparação | sem base confiável para agosto (depende de backup); marcar "sem base" |
| Dono da leitura | Lucas Rosi (proposta) |
| Valor | preencher a partir da fonte, falta de dado não vira zero |
| Complemento | Demandas abertas pelo portal em `wfa-demandas` (`status`, `criadaEm`, `cliente`) por cliente no mês |

### 2.6 Comercial

| Campo | Conteúdo |
|---|---|
| Nome | Leads por etapa, fechados e valor |
| Definição | Leads de `wfa-crm` por `stage` (0 Prospecção, 1 Diagnóstico, 2 Proposta, 3 Negociação, 4 Fechado, 5 Perdido). Fechados no mês: `stage == 4` com `up` no período (aproximação: o CRM não guarda data de fechamento; o `/next/comercial` usa a mesma aproximação e diz isso na tela). Valor: soma de `val` |
| Fórmula | `por_etapa[s] = count(l.stage == s)`; `fechados_mes = count(l.stage == 4 && "2026-09" == l.up[0:7])`; `valor_fechado = sum(val)` dos fechados no mês; `pipeline_aberto = sum(val) where stage < 4` |
| Fonte | `wfa-crm` (`stage`, `val`, `up`, `source`, `resp`, `due`) |
| Período | setembro/2026 |
| Comparação | agosto/2026 pela mesma aproximação por `up` (lead alterado depois perde o mês; dizer isso) |
| Dono da leitura | Saulo (proposta) |
| Valor setembro | preencher a partir da fonte, falta de dado não vira zero |
| Valor agosto | preencher a partir da fonte, falta de dado não vira zero |
| Lacuna conhecida | Sem data de fechamento e sem separação recorrente x avulso no lead (decisão D7 da sprint). Leads criados por agentes têm `source` "Agentes locais" e devem ser mostrados separados dos manuais |

### 2.7 Financeiro autorizado

Só entra na tela quem tem papel: `wfa-cobranca` para admin, gestor e financeiro (ou liberação manual
`permissions.nav.cobranca`); `wfa-acerto` só admin (regra `podeVerBloco` em `workflowark.state.ts`).
No All Hands com a equipe inteira, mostrar apenas o que o Gabriel autorizar; o resto fica em
leitura restrita.

| Campo | Conteúdo |
|---|---|
| Nome | A receber, cobrado x pendente, custos do mês |
| Definição | Planilha do mês ativo em `wfa-planilha.meses[]` (mês com `id` de setembro): receitas contratadas por cliente, custos; cobrança em `wfa-cobranca` (`cobradoMeses` por cliente marca o mês como cobrado). Pendente = cliente ativo com valor no mês e sem marca de cobrado |
| Fórmula | `a_receber = sum(valor por cliente no mês)`; `cobrado = sum(valor onde cobradoMeses inclui "2026-09")`; `pendente = a_receber - cobrado`; `custos = sum(custos do mês na planilha)`; margem só se receita e custo vierem da mesma fonte: `1 - custos / a_receber` |
| Fonte | `wfa-planilha`, `wfa-cobranca`, `wfa-acerto` (acerto só admin), `wfa-fin` (legado), extratos em `wfa-extratos` via `/inteligencia` se importados |
| Período | setembro/2026 |
| Comparação | agosto/2026 (mês anterior na mesma planilha) |
| Dono da leitura | Gabriel |
| Valor | preencher a partir da fonte, falta de dado não vira zero |
| Lacuna conhecida | "Recebido" de verdade só existe se os extratos de setembro foram importados; sem extrato, apresentar "cobrado" e não "recebido". Não misturar renda pessoal do Gabriel (sigilo) |

### 2.8 Qualidade técnica

| Campo | Conteúdo |
|---|---|
| Nome | Builds, testes e incidentes |
| Definição | Execuções do workflow "Deploy WorkFlowArk" no período; quantas verdes; quantas com job de testes vermelho (o deploy sobe mesmo com teste vermelho, regra nº 1 do CI); incidentes registrados em `memoria.md` e `docs/MELHORIAS.md` |
| Fórmula | `gh run list --workflow "Deploy WorkFlowArk" --created "2026-09-01..2026-09-30" --limit 200 --json status,conclusion,createdAt,headSha`; `deploys = count`; `verdes = count(conclusion == "success")`; testes por job em `gh run view <id> --json jobs`; `commits = git log --since=2026-09-01 --until=2026-10-01 --oneline main | wc -l` |
| Fonte | GitHub Actions do repo (`gabrielkfi...`, ver memória `workflowark-github-acesso-remoto`), `git log`, `memoria.md` |
| Período | setembro/2026 |
| Comparação | agosto/2026 com os mesmos comandos |
| Dono da leitura | Gabriel (ou dev revisor definido em D3) |
| Valor setembro (deploys, verdes, testes vermelhos, incidentes, tempo até correção) | preencher a partir da fonte, falta de dado não vira zero |
| Valor agosto | preencher a partir da fonte, falta de dado não vira zero |
| Incidentes conhecidos de setembro (conferir na memória) | 07 a 10/09: job de testes pós-deploy vermelho por 4 pushes (`teste-chaves-sync` procurava `WFA_CLOUD_KEYS` no HTML após o split), corrigido em 10/09; 14/09: incidente de gravação (memória `workflowark-incidente-gravacao-14-09-2026`); 10/09: WhatsApp comercial banido (fora do CI). Tempo até correção: calcular do primeiro run vermelho ao primeiro verde |
| Revisões pendentes | Listar branches sem merge na data de corte (`fix/kanban-confiabilidade-fable`, `feat/apple-workflow-review`, `feat/next`, outras) com data do último commit |

### 2.9 Conversões da landing

| Campo | Conteúdo |
|---|---|
| Nome | Leads vindos de `/conheca` |
| Definição | Leads em `wfa-crm` com `source == "Site /conheca"` criados no período. Só existe se a landing e o endpoint de lead tiverem sido publicados e o destino confirmado (decisões D1 e D2 da sprint de 21 a 25/09) |
| Fórmula | `leads_site = count(l.source == "Site /conheca" && criado no período)`; a data de criação usa `up` do primeiro registro, ou o campo que o endpoint gravar (definir no endpoint: `criadoEm`) |
| Fonte | `wfa-crm`; visitas só se houver tracking configurado e respeitando a configuração aplicável; eventos de teste separados dos reais (lead de teste identificado no `obs`) |
| Período | da data de publicação a 30/09/2026 (informar a data) |
| Comparação | sem base (landing não existia em agosto). Escrever "sem base" |
| Dono da leitura | Saulo (proposta) |
| Valor | preencher a partir da fonte, falta de dado não vira zero |
| Se não foi publicada até 30/09 | Escrever "landing não publicada no período" e trazer o estado da entrega (preview, decisão pendente) |

### 2.10 Agentes

| Campo | Conteúdo |
|---|---|
| Nome | Itens da fila dos agentes locais |
| Definição | Itens de `wfa-agentes-fila` por `status` (`pendente`, `aprovado`, `recusado`, `executado`) e por `tipo` (lead, ideia, tarefa, conteudo), com `recebidoEm` ou `decididoEm` no período |
| Fórmula | `por_status[s] = count(i.status == s && data no período)`; `taxa_aprovacao = aprovados / (aprovados + recusados)` só se o denominador for maior que zero; `executados = count(status == "executado")` |
| Fonte | `wfa-agentes-fila` (`status`, `tipo`, `agente`, `recebidoEm`, `decididoEm`, `decididoPor`, `resultado`), página `/agentes`, comandos em `wfa-agentes-cmd` |
| Período | setembro/2026 |
| Comparação | agosto/2026 se houver itens com carimbo; a fila tem limite de 400 itens, itens antigos podem ter sido cortados (dizer) |
| Dono da leitura | Gabriel |
| Valor | preencher a partir da fonte, falta de dado não vira zero |
| Custo | Não há registro de custo na fila nem nas rotas `agentes-locais` e `agents-run`. Escrever "sem registro de custo". Se o Gabriel quiser custo no próximo ciclo, a fonte seria o console da API (Anthropic) ou o Ollama local, com campo `custo` gravado por item |
| Sucesso verificado | `executado` significa que o PC marcou execução; não prova o efeito. Onde houver `resultado` no item ou `update_task` no cartão, contar como "com evidência"; o resto como "executado sem evidência" |

## 3. Pauta, 45 minutos

| Tempo | Bloco | Conteúdo | Quem conduz (proposta) |
|---|---|---|---|
| 0 a 5 min | Abertura e regras do snapshot | Data de corte, período, o que faltou de dado, o que é proxy | Gabriel |
| 5 a 15 min | Operação | 2.1 entregas e pontualidade, 2.2 ciclo, 2.3 retrabalho (proxy), 2.4 capacidade, 2.5 pendências por cliente; abrir os ids das atrasadas e dos clientes com sinal | Caio Neves, Lucas Rosi, Danilo de Lima |
| 15 a 22 min | Comercial e landing | 2.6 funil e fechados, 2.9 leads do site ou estado da landing | Saulo |
| 22 a 27 min | Financeiro autorizado | 2.7 só o que o papel vê; o resto fica para leitura restrita depois | Gabriel |
| 27 a 33 min | Produto e técnica | 2.8 deploys, testes, incidentes, branches sem merge; resultado da sprint de 21 a 25/09 (previsto x entregue, o que foi publicado com marcador) | Gabriel |
| 33 a 37 min | Agentes | 2.10 fila, aprovações, executados com e sem evidência, "sem registro de custo" | Gabriel |
| 37 a 45 min | Conclusões viram ações | Preencher a tabela da seção 4 ao vivo; metas do próximo ciclo derivadas do observado; aprendizados | Gabriel |

Sem slide obrigatório. O painel pode ser lido deste markdown ou de `/inteligencia` e `/next`.

## 4. Conclusões viram ações (preencher na reunião)

| Ação | Dono | Prazo | Resultado esperado | Revisão futura (data) |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

## 5. Aprendizados e objetivos do próximo ciclo (preencher na reunião)

| Aprendizado | Evidência (métrica ou registro) | O que muda em outubro |
|---|---|---|
| | | |
| | | |

## 6. Lacunas de dado para decidir no próximo ciclo (proposta)

Estas lacunas apareceram ao definir as métricas. Cada uma vira decisão do Gabriel, não trabalho já iniciado.

| Lacuna | Onde aparece | Opção mínima |
|---|---|---|
| Sem campo de retrabalho nem motivo | 2.3 | Gravar `hist` de coluna também no Kanban de Atividades (`moveTask`) e um motivo curto ao voltar de homologação |
| `criadaEm` ausente em parte das tarefas | 2.2 | Gravar `criadaEm` em todos os pontos de criação |
| Sem data de fechamento no lead | 2.6 | Gravar `fechadoEm` ao mover para `stage 4` |
| Sem custo por item de agente | 2.10 | Campo `custo` e `modelo` gravados por execução |
| Sem foto de fim de mês além do backup de 14 dias | 2.1, 2.4, 2.5 | Snapshot mensal guardado fora da retenção (chave `wfa-snapshot-AAAA-MM` ou arquivo) |
| Sem separação recorrente x avulso no CRM e no financeiro | 2.6, 2.7 | Decisão D7 da sprint |
| Sem tracking de visita na landing | 2.9 | Decidir se haverá e com qual configuração |

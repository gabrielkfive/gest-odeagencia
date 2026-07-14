# Produção Audiovisual · Diagnóstico e roadmap (14/07/2026)

Pedido do Gabriel: eliminar o "bug" da frente audiovisual. O sistema deve conduzir
produtor e editor durante o trabalho (o que fazer, quando fazer, próximo passo),
substituindo memória humana e treinamento verbal por fluxo dentro do WorkFlowArk.

## Diagnóstico (o que o sistema já tem e onde está o buraco)

O que já existe e será reaproveitado:

1. Tarefas com checklist embutido. Cada tarefa em `wfa-tarefas` já tem o campo
   `checklist:[]`, modal estilo Trello com timer, comentários e anexos.
   Estrutura: `{id, title, desc, funcao, clienteId, resp, data, prio, status, tags, checklist, sprintN, origem, criadaEm}`.
2. Gerador de sequência de tarefas por template. O onboarding de cliente
   (workflowark.html, ~linha 6041) já cria uma cadeia de tarefas com função,
   responsável e prioridade. É exatamente o padrão do fluxo captação para edição.
3. POPs de Produtor e de Edição já escritos (página Processos, subpáginas
   `pop-produtor` e `pop-edicao`), com passos D-2, D-1, Dia D e D+1. Problema:
   são página estática de leitura, desconectada das tarefas reais.
4. Clientes já têm `cap` (captações/mês) no cadastro; `RESPONSAVEIS_FN` já mapeia
   'Captação' para Samuel Magalhães.
5. WhatsApp de saída pronto (Evolution API no worker, ~linha 700 do
   workflowark.state.ts) para avisar o editor na passagem de bastão.
6. Conselho já tem reunião sob demanda (action `conselho`, campo "Convocar
   reunião"), porém roda em Haiku com 1600 tokens, por isso parece raso.

O buraco: não existe entidade "captação" nem "vídeo". Hoje a captação vira uma
tarefa genérica, o material fica no Drive, o roteiro fica no WhatsApp, e a ponte
captação para edição depende da cabeça do Gabriel. Nenhum checklist de POP trava
conclusão de nada.

## Roadmap priorizado

### P1 · Módulo Produção Audiovisual (impacto alto, esforço médio)
Nova página `page-producao` + estado `wfa-producao` (entra em STATE_KEYS,
WFA_CLOUD_KEYS e WFA_MERGE_KEYS).
Entidade captação: `{id, clienteId, data, produtor, local, roteiro, status, videos[]}`.
Cada vídeo: `{id, titulo, roteiroTrecho, editor, prazo, status}` com esteira
captado, em edição, revisão, aprovação, entregue.
Fluxo: concluir captação SÓ com o checklist do produtor (POP D-2 a D+1) completo.
Ao concluir, o sistema gera automaticamente 1 tarefa de edição por vídeo, já com
roteiro, briefing, checklist técnico do editor, prazo, cliente e responsável
(padrão do onboarding, origem `captacao`).

### P2 · POPs vivos dentro da tarefa (impacto alto, esforço baixo)
Tarefa com `funcao` Captação ou Editor recebe o checklist do POP injetado no
modal automaticamente. Concluir bloqueado enquanto o checklist não fechar.
Mata a distância entre "POP escrito" e "POP executado".

### P3 · Passagem de bastão pelo WhatsApp (impacto médio, esforço baixo)
Captação concluída dispara mensagem ao editor com cliente, roteiro, prazo e link
do material. Uma mensagem por captação, direcionada, sem flood. Reusa a Evolution API.

### P4 · Prazo automático por perfil de cliente (impacto médio, esforço baixo)
SLA de edição por cliente (ex.: Vivenda 4 dias úteis) no cadastro; as tarefas de
edição nascem com data calculada, ninguém decide prazo de cabeça.

### P5 · Conselho com cérebro maior (impacto médio, esforço baixo)
Reunião do conselho passa a rodar em Sonnet com teto de tokens, recebendo
organograma + demandas da semana como contexto. Chat avulso continua em Haiku
para custo baixo.

### P6 · Financeiro de verdade com extratos da Hyper (impacto alto, esforço médio-alto)
`wfa-extratos` e a rota /inteligencia já existem. Plugar a API da Hyper e montar
o dashboard de rentabilidade por cliente: demandas feitas x valor do contrato x
conversas no WhatsApp. Responde ao "esse cliente a gente faz demanda pra caralho
e nem cobra direito". Depende do Gabriel fornecer credenciais da Hyper.

### P7 · Relatório semanal do funil (impacto médio, esforço baixo)
Meta já conectado ao Growth Hub. Gerar resumo semanal automático de gasto x
conversas iniciadas x fechamento, entregue como notificação para aprovação.

## Ordem de execução sugerida
P1 e P2 juntos (mesma área do código), depois P4, P3, P5. P6 quando a chave da
Hyper chegar. Cada fatia: build + teste mobile + deploy verificado + commit/push.

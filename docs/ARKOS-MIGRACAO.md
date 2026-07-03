# ArkOS · Migração do V1 (goal do Gabriel, 03/07/2026)

**Condição de pronto**: o ArkOS (`/os`) tem as mesmas funcionalidades do V1, com mais
qualidade, sem bugs e com design mais apurado ainda (fluidez estilo página da Apple).
**WhatsApp fica FORA** da nova versão, a não ser que dê para fazer o WhatsApp perfeito.

## Linguagem visual (referência: apple.com/airpods-max)

- Tipo display 80 a 110px, peso 600/800, tracking apertado (-1.5% a -4%); dois tons
  (linha 1 tinta, linha 2 cinza).
- Corpo 17px/25px. Um assunto por bloco, respiro generoso.
- Reveal ao rolar: 0.6s ease-out (`easeApple = [0.25,0.1,0.25,1]`), componente `Reveal`
  (whileInView) em `src/components/arkos/ui.tsx`.
- Seções claras e escuras alternadas (Meu Mês é o exemplo completo).
- Base de tokens do Figma v2 em `docs/ARKOS-V2-TOKENS.md`.

## Arquitetura

- `src/routes/os.tsx`: casca (Route, RAIL, shell, troca de vistas com AnimatePresence).
- `src/components/arkos/tokens.ts`: CSS + física (spring, easeApple).
- `src/components/arkos/dados.ts`: tipos, demos, `useArkData` (leitura + ações).
- `src/components/arkos/ui.tsx`: Boot, Spark, Donut, AgentCard, AgentExpanded, Reveal, MissaoOverlay.
- `src/components/arkos/vistas.tsx`: uma função por vista.
- Regra do Gabriel: NUNCA mexer no V1 (`/app`, `public/workflowark.html`) nessa migração.
- Deploy: build + wrangler deploy MANUAL sempre com commit+push (CI não publica).
  Marcador `data-build` no `.arkos` a cada fatia; verificar com curl + screenshot.

## Migrado e no ar (verificado)

| Vista | O que faz | Dados |
|---|---|---|
| Mission Control | dashboard (herói, meta, tarefas do dia, fila, feed, KPIs, agentes) | wfa-tarefas, wfa-social-fila, wfa-notificacoes |
| Operações | grupos Atrasadas/Hoje/A seguir; CONCLUIR tarefa (check) e CRIAR tarefa | wfa-tarefas via save-state (leitura fresca antes de gravar) |
| Aprovações | fila do agente social com aprovar/recusar animado | wfa-social-fila via action social-decide |
| Agentes | grid da sociedade + overlay de vidro | estático + status |
| Financeiro | leitura: receber/pagar/sobra do mês ativo + cobrança cobrado/pendente | wfa-planilha, wfa-cobranca (mensalidades em CLIENTES_BASE) |
| Memória | briefings do conselho + linha do tempo | wfa-conselho-briefings, wfa-notificacoes |
| Clientes | carteira com saúde (gr/y/r), plano e tarefas por cliente | CLIENTES_BASE + wfa-clientes-custom |
| Meu Mês | apresentação Apple: um número gigante por seção, claro/escuro | stats do mês (concluídas, aprovadas, sobra, carteira) |
| Lançar missão | barra do topo fala com o JARVIS (overlay com resposta) | action jarvis |

Bug real corrigido na migração: o ArkOS lia campos errados de wfa-tarefas
(`titulo/prazo/done`); o V1 usa `title/data/status:'concluido'`. Logado, os números
saíam todos errados. Corrigido em dados.ts (03/07).

## Falta migrar (backlog, em ordem sugerida)

1. Planejamento (page-planejamento) e Calendário editorial (já existe rota /calendario).
2. Demandas + Rotinas + POPs/Processos (operação por função).
3. OKRs (page-okrs) e Painel/Meu Dia por papel.
4. CRM / Comercial (page-crm, page-comercial) e Régua (page-regua).
5. Acerto (page-acerto) e detalhes do Financeiro (edição da planilha).
6. JARVIS página cheia (page-jarvis, voz) e Conselho war room (page-warroom, page-conselho).
7. Drive (page-drive), Organograma, Reuniões, All-hands, Tutorial/Jornada.
8. Alpha (page-alpha e abas) e Campanhas.
9. WhatsApp: SOMENTE quando der para fazer perfeito (ordem explícita do Gabriel).

## Aprendizados

- Item de tarefa do V1: `{id, title, desc, funcao, clienteId, resp, data, prio, status,
  tags, checklist, sprintN, origem, criadaEm}`; concluída = `status==='concluido'`.
- Proposta social: `{id, clienteId, cliente, date, ts, status, formato, tema, gancho,
  roteiro, legenda, cta, captacao, melhorDia, origem}`.
- Planilha: `{meses:[{id, nome, receitas:[{nome,valor,custo}], pagar:[{nome,valor}]}], ativo}`.
- Cobrança: mapa `id → {resp, whatsapp, pix, cobradoMes:'YYYY-MM', feitas, _plan, _nome, _valor}`.
- Briefing: `{id, clienteId, cliente, date, ts, lido, debate, decisao, plano, ...}`.
- save-state grava a chave INTEIRA: sempre ler fresco, mudar um item e gravar; nunca
  remover campos desconhecidos.

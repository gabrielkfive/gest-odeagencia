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

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

### Bloqueadas — precisam de decisão de telefonia (provedor + conta + custo/min)
- [ ] CRM: power dialer (discagem paralela de listas, descarta quem não atende)
- [ ] CRM: IA em tempo real transcrevendo a call + sugerindo resposta pro SDR + bip de contexto
  > Ambas exigem telefonia de verdade (ex.: Twilio/Zenvia) com credenciais e custo por minuto.
  > Antes de codar: o Gabriel decide o provedor e abre conta. Aí a gente engata.
  > **Plano técnico pronto em `docs/PLANO-POWER-DIALER.md`** (arquitetura Twilio + Cloudflare,
  > fases, custos a verificar e as 3 decisões que faltam).

### Abertas (livres pra pegar)
- [ ] (adicione aqui o que vier na próxima conversa)

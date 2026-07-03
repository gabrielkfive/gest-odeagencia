# Remodelagem do Conselho de IA (pedido do Gabriel, 02/07/2026)

## O que ele quer (nas palavras dele)
"Remodelar essa página todinha. Deixar de um jeito que eu possa usar. Eu quero clicar,
quero botar essa galera pra trabalhar, quero conversar, quero juntar, fazer uma reunião deles."

## Estado atual
- Página `page-conselho` mostra briefings do dia (gerados por rotina diária) e um botão de disparar.
- Agentes rodam sozinhos (origem `conselho-auto` cria tarefas), o Gabriel só LÊ o resultado.
- Já existem as actions no Worker para chamar agentes (padrão `agente-roteirista` em `workflowark.state.ts`), e o `cloudCall` exige sessão Supabase (logado).

## Desenho proposto (3 blocos, no padrão visual AURA/OS)
1. **Bancada de agentes**: um card por agente (moedinha squircle colorida + nome + função + última execução),
   com botão "Acionar agora" (roda o agente com contexto do dia) e um campo rápido "pedir algo específico".
2. **Conversa**: clicar num agente abre painel lateral de chat (mesmo motor do JARVIS/roteirista,
   action nova `agente-chat` com `persona` no payload; manter histórico por agente em `wfa-conselho-chat-<id>`).
3. **Reunião do conselho**: botão "Convocar reunião" com tema; o Worker roda os agentes em sequência
   sobre o mesmo tema (cada um responde ao anterior, 1 rodada) e devolve uma ata com decisões e tarefas
   sugeridas (aproveitar o formato dos briefings + `addTask` origem `conselho-reuniao`).

## Passos de implementação
1. Action `agente-chat` no `workflowark.state.ts` (persona + mensagens; reusar o client LLM das actions atuais).
2. Action `conselho-reuniao` (tema → loop de personas → ata JSON {resumo, decisoes[], tarefas[]}).
3. UI da bancada (HTML estático em `page-conselho` + render dos cards; CSS já sai do tema AURA).
4. Chat lateral (reusar padrão do modal de tarefa, `position:fixed` à direita, glass 94%).
5. Ata da reunião vira card salvo em `wfa-conselho-briefings` (aparece no Meu Dia como hoje).

## Cuidados
- `cloudCall` só funciona LOGADO (no /app); no /workflowark direto sem sessão os agentes falham.
- Custo: reunião = N chamadas de LLM; colocar teto (ex.: 4 agentes, 1 rodada).
- Não mexer no cron diário existente; a reunião é sob demanda.

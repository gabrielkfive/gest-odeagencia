# Resumo da sessão · Redesign WorkFlowArk (02/07/2026)

Copiar e colar isto na conversa com o "arquiteto" (ChatGPT) para reconciliar com a arquitetura V2 original (`docs/ARK-V2-MIGRATION-PLAN.md` e `docs/ARKOS-V2-HANDOFF.md`).

## Decisão de rumo

O `/os` (ARK OS Mission Control, `src/routes/os.tsx`) virou laboratório de design, não produto: é onde testamos ideias rápido (tema claro fiel ao Figma, motion, densidade Ramp/Fiverr) antes de levar pro sistema real. Gabriel decidiu não investir em polir os bugs do `/os` e concentrar o esforço no **WorkFlowArk de verdade** (`public/workflowark.html`, o monólito que a equipe usa todo dia). Nada de lógica foi reescrita, só a camada visual e algumas correções de comportamento.

## O que mudou no sistema real (tudo verificado, 0 erro de console)

**Estrutura (não só estilo):**
- Sidebar deixou de ser colada na borda com cor trocando por item: agora é uma peça flutuante, colada na borda esquerda real da tela (cantos vivos ali) e arredondada só do lado que encontra o conteúdo.
- Indicador único desliza com física de mola atrás do item ativo, em vez de cor trocando seco.
- Sidebar agora recolhe pra uma faixa de 76px só com ícones (botão no topo); passar o mouse expande temporariamente por cima do conteúdo, sem empurrar o layout (dock do Mac). Estado persiste.
- Toda troca de página/aba/modal agora "chega" (fade + leve subida) em vez de corte seco — aplicado no sistema inteiro de uma vez.

**Bugs corrigidos:**
- **Kanban de Atividades**: o alvo de soltar um card era só do tamanho da pilha de cards (sobrava espaço "morto" embaixo onde o drop não registrava). Agora a lista preenche a coluna inteira — dropar em qualquer altura funciona, e o drop também reordena pela posição real (estilo Trello), não só troca de coluna.
- Removidos os botões de seta (↑ ↓ →) dos cards de tarefa — eram confusos e redundantes agora que o arrastar é confiável; ficou só o excluir.
- Cronômetro de tarefa agora começa sozinho na criação (antes era manual, escondido no detalhe da tarefa). Ele congela quando a tarefa é concluída, virando o "tempo real gasto".

**Visual (aplicado via a camada CSS única que já regia o sistema, "APPLE REFORM" — afeta as 35+ telas de uma vez):**
- Todo botão dourado principal ganhou o brilho que passa no hover.
- Cards, tabelas, alertas e calendário do sistema inteiro subiram de cantos de 4-8px sem sombra pra cantos generosos com sombra em duas camadas.
- CRM Pipeline e Jornada · Sprints (que ainda estavam no visual quadrado antigo) alinhados ao resto.

**Telas específicas:**
- Meu Dia: reordenado (pedido do Gabriel) — hoje mostra primeiro KPIs/tarefas/agenda, Panorama do time, e só no final o card do JARVIS (antes era a primeira coisa que aparecia). Tarefas com hover físico, botões com bounce de mola.
- Meu Painel: redimensionar widget agora tem física real de janela (estoura e assenta, técnica FLIP + spring), em vez de trocar de tamanho seco.
- Central de Agentes, Financeiro, WhatsApp, Squad Alpha: já estavam num padrão bom de sessões anteriores (conferido, não mexido).

## Achado importante pro arquiteto

As referências reais de Figma que o Gabriel escolheu (SaaS Dashboard UI Kit, Apple Vision Pro HR) são **tema claro**, com vidro só em momentos específicos (não um void escuro full-screen). O handoff anterior (`ARKOS-V2-HANDOFF.md`) tinha ido na direção dark/glass total — já ajustado no protótipo `/os`, mas o sistema real nunca teve esse problema (o "Apple Reform" já era claro).

## Pendências / próximos passos (não feitos ainda)

- Lista de Clientes, Jornada do Cliente, Comercial e Meu Painel ainda estão em dinâmica básica — Gabriel pediu mais densidade/interatividade, no nível do que foi feito em Meu Dia.
- Ideias em aberto do Gabriel, ainda não decididas: caixas com imagens/produtos/dashboards reais; mostrar os agentes de IA "rodando" visualmente (não só chat); repensar se o fundo off-white deveria ser mais branco ou mais espelhado/vítreo em alguns pontos.
- Continuar a mesma linha de trabalho em JARVIS, Planejamento de Conteúdo e Financeiro.
- Nada disso foi commitado ainda — está local, rodando em `npm run dev` → `http://localhost:8081/workflowark.html`, aguardando validação do Gabriel antes de subir.

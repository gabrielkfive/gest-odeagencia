# WorkFlowArk, especificação de design

Atualizado em 10/09/2026. O objetivo desta fase é confiabilidade, não embelezamento:
toda mudança visual daqui pra frente precisa preservar o que já funciona e nunca esconder
estado de gravação da pessoa.

## Princípios

1. Ferramenta de trabalho, não demo. Densidade alta, resposta imediata, nada de animação
   que atrase uma ação. Animação só quando explica movimento (o cartão deslizando de
   coluna, FLIP de 0,28 s) e sempre respeitando `prefers-reduced-motion`.
2. A pessoa sempre sabe se o que fez já está salvo. Três estados visíveis e curtos:
   "Salvando…", "✓ Salvo HH:MM", "⚠ Não salvou ainda · tentando de novo". Nunca vermelho
   de pânico por um blip de rede; o dado está no aparelho e sobe sozinho.
3. Sem caixa de confirmação onde dá para desfazer (padrão já adotado: toast com Desfazer,
   exclusão com 3 s para cancelar). Confirmação só para perda definitiva.
4. Mobile é produção. Toque tem que fazer tudo que o mouse faz (arrastar, reordenar,
   rolar coluna). Alvos de toque de no mínimo 40 px; menu lateral começa escondido.
5. Tema escuro e claro em paridade. Regra de tema nunca perde para regra com id (bug de
   25/08: lista pintava branca no escuro).

## Tokens (os que o app já usa)

- Amarelo da marca: `--yel` (`#FFC700` no app; `#FEEF02` é o amarelo da identidade
  comercial da ARK, usado em propostas e site, não aqui).
- Superfície e fundo: `--bg`, `--surface`, `--line`; texto secundário `--mute`; erro
  `--red`. No escuro, superfície translúcida precisa de fundo opaco por baixo (o modal
  usa `background-color: var(--bg)` mais `linear-gradient(var(--surface), var(--surface))`).
- Tipografia: a do sistema (Inter na web, SF no iPhone). Título do cartão 13 px, meta
  11 px, chip 10 a 11 px.
- Raio: 18 px no modal, 999 px em pílulas, 8 a 12 px em cartões.

## Componentes que importam

- Cartão de tarefa (`.task-card`): título, cliente, responsável, prazo, chips (⏱ tempo
  quando existe, com pulso quando o relógio está correndo). Arrastável; estado
  `.dragging` fica translúcido; a coluna de destino ganha `.drop-on`.
- Coluna (`.task-col` / `.task-list`): a coluna inteira é área de soltar; contador no
  cabeçalho; "Vazio" discreto quando não há cartão; Concluído mostra 30 e um botão para o
  resto.
- Tela da tarefa (`#pj-modal`, padrão ClickUp): à esquerda título, status com ✓ de
  concluir, responsáveis em chips, datas, cronômetro (▶ Start / ⏸ Parar / ↺ Zerar, com
  o contador andando ao vivo), etiquetas, descrição, checklist, anexos com upload e Ctrl+V;
  à direita a atividade (histórico e comentários). Rodapé: Excluir, indicador de autosave,
  Fechar (ou Cancelar quando é tarefa nova), Salvar.
- Indicador de sync (`#sync-status`, topo): texto curto, cor `--mute` ou amarelo de
  atenção, `title` com a explicação completa.
- Toast: 2,4 s para informação, 6 s para erro; toast com ação para Desfazer.

## Textos

- Português, direto, sem jargão. "Salvo", não "persistido". "Não salvou ainda", não
  "falha de sincronização".
- Sem traço ou travessão como separador (regra do Gabriel). Vírgula ou ponto.
- Rótulos de coluna: Backlog, A iniciar, Em Andamento, Homologação, Homologação do
  cliente, Concluído.

## Referências futuras (não aplicar antes de estabilizar)

- 21st.dev como catálogo de componentes para a fase de redesign (ArkOS / migração V1).
- Linguagem Apple (fluidez, materiais) descrita em `docs/ARKOS-V2-TOKENS.md`.

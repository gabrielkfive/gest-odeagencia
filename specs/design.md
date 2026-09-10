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

## Kanban e detalhe da tarefa no shape 21st / Apple (11/09/2026)

Referência: Kanban Board de Arun Dass no 21st.dev (React, lucide-react, framer-motion), recriado em CSS e JS puros, sem mudar a stack. Cartão branco de canto 16 px (escuro: #16171b com borda rgba(255,255,255,.10)), chips de cliente e etiqueta com ponto colorido por hash (`tcDot`), prioridade em chip, título 15 px, descrição em 2 linhas, rodapé com divisor (prazo, checklist, relógio, estimativa, comentários, anexos) e avatares. Capa: a primeira imagem anexada aparece no topo do cartão (`.tc-capa`) e no topo do modal (`#tk-capa`, com miniaturas das outras imagens).

Modal da tarefa (`tkAbrir`): mesmo conteúdo de antes, nova forma. Container `.pj-f` com raio 24 px, fundo da página com blur (`#pj-modal`), entrada com escala .97 e opacidade em 220 ms (desligada em `prefers-reduced-motion`, blur desligado em `prefers-reduced-transparency`). Topo fixo com migalha em pílula e botão X (`[data-tkx]`, que aciona o mesmo caminho do Fechar, logo o autosave pendente grava). Status `#tk-st` recebe `data-st` com o valor atual e vira pílula na cor da coluna. Campos em bloco arredondado, descrição, checklist e anexos como cartões, rodapé fixo com o indicador de autosave. No celular o rodapé deixa de ser fixo e os campos não estouram a largura.

Regra: qualquer mudança nesses estilos roda `npm run teste:mobile`, `teste:arrastar` e `teste:confiabilidade`, e passa por captura em claro e escuro com dado sintético (ver deploy/teste-arrastar-tarefas.mjs para a semente).

## Atividades no shape de app (revisão Apple, 10/09/2026)

Substitui a leitura "landing page" do bloco anterior por hierarquia de ferramenta. Estilos no
fim de `workflowark-<data>.css`, escopados em `#page-tarefas`, com tokens próprios
(`--tf-fill`, `--tf-col`, `--tf-card`, `--tf-line`, `--tf-ink`, `--tf-mute`) definidos para
claro e escuro no mesmo lugar.

- Barra de ferramentas: título 22 px, subtítulo 12 px (some no celular), à direita o
  indicador de sync, o botão Filtros (só celular, com contador de filtros ativos), o "Mais"
  (select nativo com Remover duplicadas e Adiar atrasadas) e Nova. Altura 32 px, raio 9 px.
- Filtros: sem caixa, controles de 32 px em fundo `--tf-fill`, sem emoji nos rótulos. No
  celular ficam escondidos até o botão Filtros abrir (`#page-tarefas.filtros-abertos`) e rolam
  numa linha só.
- Vistas: controle segmentado (Kanban, Lista, Por pessoa, Mais) com os quatro indicadores em
  linha ao lado (`.tf-kpis`, número 14 px e rótulo 11,5 px), no lugar dos quatro cartões.
- Colunas: fundo `--tf-col` (cinza neutro), sem borda, raio 14 px, 284 px de largura;
  cabeçalho com ponto de 8 px na cor do status e contador. A altura é o que sobra da área de
  rolagem abaixo do topo do quadro (`wfaAjustaAlturaBoard`), então a página não rola e a
  barra fica sempre visível; o snap de rolagem foi removido.
- Cartão: fundo `--tf-card`, hairline `--tf-line`, raio 12 px, padding 11/12 px. Ordem:
  capa (96 px quando existe), título 13,5 px/600, descrição 12 px em 2 linhas, contexto
  (cliente 600 e etiquetas 500, 11,5 px, ponto colorido por `tcDot`), rodapé com prioridade
  (`.tc-prio`, só Alta ou Baixa), prazo, checklist, relógio, estimativa, comentários, anexos
  e avatares de 22 px. Hover só muda sombra e borda (nunca transform). `tabindex=0`, Enter
  abre, foco visível em anel amarelo. O X de excluir aparece no hover e sempre no toque.
- Detalhe da tarefa: capa 168 px (132 no celular), título 24 px, rótulos de linha em
  124 px, ações do cartão em pílulas compactas de 32 px, etiquetas neutras com ponto na cor
  (a ligada pinta o fundo). `.pj-f` tem `role=dialog`; Esc aciona o mesmo caminho do Fechar
  (autosave pendente grava). No celular `.tkwrap` é a única área de rolagem.
- Provas: `npm run teste:apple` (390, 430 e 1440 px, claro e escuro, sem overflow, quadro na
  primeira dobra, filtros, teclado, mover e recarregar, cronômetro) e `npm run capturas:apple`
  para as capturas com dado sintético. Rede externa bloqueada e servidor local em
  `deploy/apple-review-ambiente.mjs`.

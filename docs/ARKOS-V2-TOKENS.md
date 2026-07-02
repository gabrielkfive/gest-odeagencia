# ARK OS V2 · Tokens extraídos das referências do Figma

Extraído em 02/07/2026 via screenshots em alta resolução dos 3 arquivos de referência
(o MCP do Figma bateu no limite do plano Starter, então a leitura foi visual, pelo
viewer do Figma no navegador). Screenshots em `C:\Users\USER\figma-*.png`.

## Referência 1 · SaaS Dashboard UI Kit ("Terroni")

Arquivo: figma.com/design/LrIM92EtOy7enD8wbsGNvQ, frame "Desktop - 2".

- Fundo do app: cinza-lavanda claríssimo (aprox `#F5F6FA`)
- Cards: branco puro, raio ~16px, sombra quase nula (superfície plana, separação por cor de fundo)
- Cor de marca e texto forte: azul-marinho profundo (aprox `#1E2A5A`)
- Tipografia: sans geométrica amigável (números de destaque enormes, peso 700, tracking apertado; ex.: "1.05m" ocupando meio card)
- Gráficos: área verde-menta com gradiente vertical suave (linha `#7FD8A4`, preenchimento `#DCF5E8` → transparente)
- Variação positiva: verde `+8.5% ↑`; negativa: vermelho suave
- Tooltip de gráfico: pílula navy com texto branco, ponteiro tracejado vertical
- Donut: teal `#7DD8D8` + navy + cinza claro
- Abas de canal no topo: texto cinza, ativa em navy com sublinhado
- Sidebar: card branco, item ativo com ponto indicador, ícones de linha, card "Upgrade PRO" com ilustração no rodapé
- Feed de atividade (coluna direita): avatar + @handle bold + tempo cinza + texto cinza, separação só por espaçamento
- Grid: 3 colunas (sidebar fixa, conteúdo fluido, feed ~260px), gutters ~20px

## Referência 2 · Dashboard Marketing ("Vision")

Arquivo: figma.com/design/fna6B94itGZ77fWZgAKKSd, frame claro principal.

- Shell: fundo lavanda claro `#F1F2FA`, container externo branco com raio ~24
- Sidebar branca: logo com orbe preta, labels de seção minúsculas cinza ("Administrator", "Settings"),
  **item ativo = pílula preta com texto e ícone brancos** (raio full), inativos em azul-acinzentado claro,
  badge vermelho no Inbox, toggle claro/escuro no rodapé
- Barra superior: busca branca larga raio ~12, pílula de data/hora, sino, avatar
- **Card herói preto brilhante** (`#131316` com gradiente e esfera 3D decorativa):
  "Dashboard Overview" pequeno, "Hello Stevens 👋" gigante (~40px bold),
  dois sub-cards internos translúcidos (branco ~6% de opacidade, raio 16) com
  chip de ícone circular, label uppercase espaçada cinza e número grande branco
- Card "Marketing Goal" preto: donut branco sobre cinza com % no centro, valor embaixo,
  legenda pequena, botão branco arredondado ("Show All Sales")
- Tabela "Latest Transaction" em card branco: cabeçalho cinza-lavanda, preços coloridos
  (`+` verde-menta `#3DD9A4`, `-` vermelho `#F4645C`, pendente amarelo `#FFC145`),
  chips de status (menta/vermelho/amarelo, texto branco, raio ~6), botão "Detail" preto pequeno
- Lista "Sales History": ícone 3D colorido raio ~16, nome bold + subtítulo cinza, chip de valor menta
- Tipografia: geométrica arredondada (estilo Poppins/Jost), números com peso forte

## Referência 3 · Apple Vision Pro HR (vidro)

Arquivo: figma.com/design/MQPXFD30CUtKCRmOisFhcM, frame "Vision Pro Dashboard".

- Painéis de vidro escuro fosco sobre foto ambiente, raio ~24, borda hairline branca ~10%
- Dock inferior em pílula de vidro com abas (Dashboard, Expense, Timesheet, Settings), ativa mais clara
- Botões: azul `#2E7CF6` para ação primária, cinza translúcido para secundária, texto vermelho para destrutiva (Clock Out)
- Números de dinheiro/tempo em fonte mono espaçada (ex.: `12,800.00`, `00:52:03`)
- Barras de progresso finas com avatar/ícone na ponta e rótulo `n/n`
- Lista "Waiting For Approval": avatar, nome bold, contexto cinza, pílula "Approve" + X vermelho
- Slots "Add widget" fantasma (borda tracejada implícita, + central)

## Síntese para o ARK OS (decisão de design)

Estrutura e componentes fiéis às refs 1 e 2 (shell claro), vidro da ref 3 reservado
para overlays especiais (expansão da sociedade de agentes). Marca ARK entra no lugar
do accent das refs:

- `--bg: #F1F2F7` (lavanda claro) · `--card: #FFFFFF` raio 16-24 · `--ink: #16181D`
- Herói e "Meta do mês": cards pretos `#131316` estilo Vision, com amarelo ARK `#FFC700`
  no lugar do menta como cor de destaque de marca (donut, chip ativo, CTA)
- Semântica financeira continua verde/vermelho (`#3DD9A4` / `#F4645C`), pendente `#FFC145`
- Item ativo da sidebar: pílula preta (Vision); hover suave
- Fontes: Sora (display/números) + Inter (texto), números tabulares
- Tabela de operações com chips de status e botão "Detalhe" preto; aprovações no
  padrão "Waiting For Approval" (pílula Aprovar + X)
- Motion: manter física do os.tsx atual (springs, layoutId), boot mais curto

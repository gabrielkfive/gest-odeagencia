# Design system · WorkFlowArk

Fonte da verdade: `public/workflowark-20260915a.css` (variáveis em `:root` e no tema
escuro). Tela nova usa estas variáveis; cor solta no código é erro.

## Direção

Sóbrio, claro e direto, com amarelo da marca só no que pede ação. Nada de frase de efeito
na interface; cada rótulo diz o que a coisa faz.

## Cores (tema claro)

```
--bg:      #fafaf7   fundo da página
--surface: #fff      cartão e painel
--ink:     #0a0a0a   título
--txt:     #262626   texto
--mute:    #737373   texto secundário
--line:    #e8e6e0   borda
--yel:     #FFC700   ação principal, item ativo
--yel-d:   #d4a300   amarelo em texto sobre fundo claro
--red:     #dc2626   atraso, erro, número de alerta
--green:   #16a34a   concluído, ok
```

O tema escuro (`body.aura-dark`) redefine as mesmas variáveis; componente novo não
escreve cor própria para o escuro, herda.

## Tipografia

- Títulos: Sora 700.
- Texto: Inter (herdado do corpo).
- Números e códigos: `--mono` (JetBrains Mono).

## Espaço, raio e sombra

- Espaço em múltiplos de 4 px: 8, 12, 16, 24.
- Raio: 14 a 16 px em cartão, 999 px em pílula.
- Borda de 1 px em `--line` no lugar de sombra pesada.

## Componentes que já existem (reusar)

`navitem` e `subitem` (menu), `page` e `page-head` (página), `kpi` (número com rótulo),
`task-card` e colunas do kanban, `form-group` e `form-select`, `toast`, modal de tarefa
(`openTaskDetail`), modal de lead (`crmOpenModal`).

## Ícones e marcas

Ícones de interface em SVG de traço 2 px. Serviço externo aparece com o **logo oficial**
(Google, Google Agenda, Instagram, WhatsApp, PDF), nunca com sigla em texto ("IG", "WA").

## Estados

Todo bloco tem estado vazio com frase simples ("Nada fora do prazo."), carregando e erro
genérico. Número de alerta em `--red` só quando é maior que zero.

## Responsivo

- Celular: até 900 px, colunas viram uma, menu lateral vira gaveta (teste
  `npm run teste:mobile`).
- Animação de entrada em sidebar, topbar ou gaveta só dentro de `@media (min-width:901px)`.

## Acessibilidade

Contraste de texto sobre `--surface` e sobre o tema escuro, foco visível em botão, item
clicável é `button` ou `a`, não `div`.

## Material de venda

Print de landing e demo usa agência e clientes fictícios, sem saudação pessoal
("Boa tarde, Gabriel") e sem nome de cliente real.

# Tarefa 08 · Sidebar na ordem final do /app

Doc 11 (21/09), linha 8 da tabela de tarefas. Dono: Claude. Prazo: 24/09.
Base: origem `origin/main` (79a7f4e, produção `20260921f-inicio-limpo`).
Fora deste lote: tokens Apple (`workflowark-design-20260921a.css`), que seguem esperando o "é isso" do Gabriel na prévia `/app-preview/`.

## O que o Gabriel pediu
CRM acima de Início. Atividades com Projetos e Gestão de clientes. Sidebar mantém forma, vidro e cantos arredondados.

## Estado medido hoje em `public/workflowark.html` (main)
1. `crm-pill` já está acima do rótulo "Menu" e do Meu Dia. Nada a mudar.
2. `atividades-menu` já tem Demandas, Rotinas e Projetos.
3. Falta "Gestão de clientes" dentro de Atividades.

## Mudança
Um subitem em `#atividades-menu`, depois de Projetos: "Gestão de clientes", `data-nav="lista-clientes"`, ícone de quadro (o mesmo do Projetos não serve, usar o de lista/pessoas). Sem tocar em CSS, sem tocar no Kanban, sem tirar nada do menu.

## Prova (pronto quando)
Captura em três estados, antes e depois, com carteira sintética e sessão falsa, no molde de `deploy/prova-app-lote1.py`:
1. sidebar aberta em 1440x900
2. sidebar recolhida (`toggleSideCompact()`)
3. celular 390x844

Mais: ordem dos itens lida do DOM impressa no terminal, zero erro de página, marcador novo na primeira linha do HTML.

## Deploy
Commit em `feat/sidebar-ordem-final`, merge em main, CI, `curl` do marcador na URL de produção, screenshot depois. Só então "no ar".

## Riscos
1. `lista-clientes` já aparece em Clientes > Lista de Clientes. Duplicar o destino é intencional: o Gabriel quer o atalho dentro de Atividades. Se ele reclamar de repetição, o ajuste é tirar da árvore Clientes, não daqui.
2. Sidebar recolhida com texto: conferir que o rótulo some e o ícone fica centralizado, o mesmo bug do "G micronizado" do rodapé.

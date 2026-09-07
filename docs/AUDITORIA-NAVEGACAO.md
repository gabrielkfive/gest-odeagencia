# Auditoria de Navegação · WorkFlowArk

## Resumo executivo

A varredura de navegação do `public/workflowark.html` encontrou 19 achados: 1 furo de controle de acesso, 3 caminhos mortos ou inalcançáveis, e o resto entre rótulos confusos, busca incompleta e defaults que sujam dados. O mais urgente: qualquer membro com a Central de Agentes liberada abre Cobranças e Acerto (Pix e valores da equipe) por clique no card, mesmo com a aba escondida pelo RBAC. A maior parte é correção segura e reversível; renomes de menu e a decisão sobre a página Pauta precisam do seu ok porque mudam o que a equipe usa todo dia.

## P0

Nenhum achado classificado como P0. O furo de acesso abaixo é o primeiro da fila de execução mesmo assim.

## P1

### 1. Cards Cobrança e Acerto furam o controle de acesso

- Evidência: `public/workflowark.html:3164` e `:3169`, `onclick="document.querySelector('[data-nav=cobranca]').click()"` e `...[data-nav=acerto]...`. O handler de navegação (linha 5705 em diante) não checa permissão nenhuma, só trata o caso whatsapp (5735). O `applyAccess` (9889) apenas esconde o item do menu com `display:none`, e `.click()` em elemento escondido dispara normal. O papel avaliador tem `agentes` liberado (9864) mas não tem cobranca nem acerto (9878 tranca acerto fora de admin).
- Problema: qualquer membro com acesso à Central de Agentes (o avaliador, por exemplo, criado justamente pra não ver dado sensível) abre Cobranças e Acerto · Pagamentos clicando nos cards. Pix da equipe e valores de pagamento ficam a um clique de quem não deveria ver.
- Correção: checar a permissão via `memberAccess()` dentro do handler de clique de navegação (5705), valendo pra card, busca global e voz do JARVIS de uma vez. Complemento: no `agPolish` (5964), esconder ou desativar os cards cujo destino a permissão nega.

### 2. Card Atendente WhatsApp morto na Central de Agentes, com selo "No ar"

- Evidência: `public/workflowark.html:3174` `onclick="document.querySelector('[data-nav=whatsapp]').click()"` e `:3177` `<span class="ag-badge on">🟢 No ar</span>`. Segunda passada da auditoria localizou o mesmo card em 4668 (onclick) e 4671 (badge). Não existe nenhum elemento com `data-nav="whatsapp"` no arquivo: o botão do menu foi removido em 27/07 (comentário na linha 1913) e a flag `WFA_WPP_OFF=true` está na linha 2463. Mesmo que o elemento existisse, a navegação redireciona whatsapp pro Meu Dia (5735, e o mesmo desvio aparece em 7229). Restos da mesma flag morta: `mdwGoWpp` (9587, busca o mesmo elemento inexistente) e a entrada `[['whatsapp','zap'],'whatsapp','WhatsApp']` do navMap do JARVIS (12184).
- Problema: o clique busca um elemento que não existe, `querySelector` devolve null e o `.click()` estoura TypeError em silêncio, nada acontece na tela (ou, no caminho com desvio, joga a pessoa no Meu Dia sem explicação). O card promete "🟢 No ar" pra um agente desligado desde 03/07. Quem clica acha que o sistema travou. Pedir "abrir whatsapp" por voz no JARVIS também falha calado.
- Correção: enquanto a Evolution estiver fora do ar, trocar o badge pra "Em manutenção" e desabilitar o clique (a classe `soon` já existe pra isso, linha 4618), ou esconder o card quando `WFA_WPP_OFF` for true. Aproveitar e limpar `mdwGoWpp` e a entrada do navMap do JARVIS.

### 3. Página Pauta existe inteira mas não tem nenhuma porta de entrada

- Evidência: `public/workflowark.html:4315` `<div class="page" id="page-pauta">` com "+ Novo briefing" (4352), "Disparar pauta" (4365) e o formulário na 4355. Não existe nenhum elemento `data-nav="pauta"` no arquivo (busca retorna zero), então o ramo de navegação da linha 5742 nunca roda. `pauta` está fora do NAV_CATALOG (9844 a 9851), então a busca global e o JARVIS (12021, `jarvisGo` depende de `querySelector('[data-nav=...]')`) também não chegam lá. A linha 14936 ainda lê `pauta-badge`, elemento que não existe em lugar nenhum.
- Problema: o fluxo de briefing com passagem de bastão (`pautaCriar` na 14876, que cria as tarefas de roteiro, edição e aprovação com prazo retroplanejado) está pronto e sincronizado em wfa-briefings, mas ninguém consegue abrir a tela por menu, busca, voz ou restauração de aba. Detalhe que morde: `pautaAvancar` continua rodando por baixo (`taskConcluir`, linha 11159, cria a próxima tarefa da cadeia sozinho) e o único botão de excluir pauta (`pautaDel`) mora nessa página inacessível. Se sobrou pauta antiga nos dados, ela gera tarefa em cadeia sem nenhum lugar pra desligar.
- Correção: decidir o destino. Ou criar a entrada (subitem "Pautas · Briefing" no grupo Operacional com `data-nav="pauta"` e `{k:'pauta',l:'Pautas'}` no NAV_CATALOG), ou remover a página e as funções pauta* de vez, inclusive a chamada dentro de `taskConcluir`.

### 4. Central de Agentes enterrada num grupo chamado Estúdio

- Evidência: `public/workflowark.html:1815` `<span>Estúdio</span>` e `:1821` `<span>Central de Agentes</span>` dentro de `<div class="subnav" id="agentes-menu">` (1818, sem classe open, nasce fechado). A página se vende como "Seus funcionários de IA" (4640).
- Problema: a vitrine dos funcionários de IA (8 cards, 4658 a 4692) fica atrás de um clique num grupo fechado com rótulo vago. Ninguém que procura "agentes" ou "IA" associa a palavra Estúdio. O próprio id interno do menu é `agentes-menu`, o código sabe o nome certo e o rótulo não.
- Correção: renomear o grupo pra "Agentes de IA" (ou promover Central de Agentes a item de primeiro nível) e fazer a Central ser a porta de entrada do grupo, igual Atividades faz com Tarefas (`data-nav` direto no navitem, linha 1721).

### 5. Organograma escondido no grupo Conhecimento, colapsado no fim do menu

- Evidência: `public/workflowark.html:1870` `<div class="nav-label collap closed" data-grp="conhecimento">` e `:1871` `<div class="nav-grp closed" id="navgrp-conhecimento">`, com Organograma nas linhas 1872 a 1875. A página (3389) tem o botão "+ Adicionar pessoa".
- Problema: Organograma não é só consulta, é onde se cadastra gente no sistema (`colabOpen`, 3389). Está no penúltimo grupo do menu, fechado por padrão, atrás de dois cliques. Quem precisa cadastrar um colaborador novo não encontra.
- Correção: tirar o Organograma do grupo colapsado (subir pro bloco principal, perto de Clientes) ou pelo menos expor "Adicionar pessoa" também nas Configurações, que é onde as pessoas procuram cadastro de gente.

### 6. Planejamento (Estúdio) e Planejamentos (Operacional) são coisas totalmente diferentes com quase o mesmo nome

- Evidência: `public/workflowark.html:1833` `<span>Planejamento</span>` (Estúdio, calendário de conteúdo, page-planejamento na 4834) e `:1767` `<span>Planejamentos</span>` (Operacional, gerador de apresentação de onboarding, comentário nas linhas 5563 a 5567). O NAV_CATALOG registra o nome certo: `{k:'planejamento',l:'Planejamento de Conteúdo'}` (11342).
- Problema: uma letra "s" separa o calendário de posts do gerador de apresentação de onboarding. Quem navega clica no errado com frequência, e a busca global mostra "Planejamento de Conteúdo" enquanto o menu mostra só "Planejamento", nomes diferentes pra mesma página.
- Correção: renomear no menu: "Planejamento de Conteúdo" no Estúdio (igualando ao catálogo) e "Apresentações de Onboarding" (ou "Planos de Cliente") no Operacional.

### 7. Busca global não encontra metade das páginas do sistema

- Evidência: `public/workflowark.html:7440` filtra só o NAV_CATALOG, e o catálogo (11338 a 11346) não tem chat, producao, briefings, planejamentos, marcas, projetos, alpha, allhands, warroom, base-conhecimento nem jarvis.
- Problema: a busca do topo é a rede de segurança de quem não acha algo no menu, mas ela ignora páginas do dia a dia como Produção, Projetos, Chat, Briefings e JARVIS. Digitar "produção" devolve "Nada encontrado" com a página existindo no menu Operacional.
- Correção: completar o NAV_CATALOG com todas as páginas navegáveis, respeitando o RBAC ao renderizar o resultado.

### 8. Dois funis com rótulos que não se diferenciam: CRM · Pipeline e Comercial > Funil

- Evidência: `public/workflowark.html:1653` a 1655, pill "CRM · Pipeline" (page-crm na 5206, kanban de negociação) e `:1703` `<span>Funil</span>` dentro de Comercial, cuja página é "Funil Comercial · Números reais · diagnóstico das variações por período" (3293).
- Problema: Pipeline e Funil são sinônimos na cabeça de qualquer comercial. Um é o quadro de leads em negociação, o outro é o relatório de números do mês, e nada nos rótulos diz qual é qual. Quem quer mexer num lead pode abrir o relatório e vice-versa, todo dia.
- Correção: renomear o subitem de Comercial pra "Números do Mês" ou "Relatório Comercial" e manter "CRM · Pipeline" como o único lugar de leads. Opcional: mover a pill do CRM pra dentro do grupo Comercial, unificando o caminho de venda num lugar só.

### 9. Comercial é dia a dia mas o grupo nasce fechado toda sessão e não lembra o estado

- Evidência: `public/workflowark.html:1700` `<div class="subnav" id="comercial-menu">` sem classe open (só atividades-menu nasce aberto, 1726 "subnav open"). O toggle não persiste nada (7244 a 7245) e o restore de página (12356 a 12370) clica no item mas não reabre o grupo pai.
- Problema: Propostas, Contratos e CRM são rotina, mas exigem reabrir o grupo Comercial a cada recarga. Pior: ao recarregar numa página do grupo, a página abre e o menu fica fechado, o usuário não vê onde está.
- Correção: persistir o estado aberto/fechado dos subnavs em localStorage (mesmo padrão do wfa-current-page) e, no restoreLastPage, adicionar a classe open ao subnav pai do item ativo.

### 10. Campo Função do modal de tarefa força "Account Manager" sem ninguém escolher

- Evidência: `public/workflowark.html:10694` `funcao:'Account Manager'` (default do openNovaTarefa) e linha 10908, o select tk-func é montado só com WFA_FUNCOES, sem opção vazia: `sel('tk-func',WFA_FUNCOES...,t.funcao||'Account Manager')`. O quick add da coluna cria com `funcao:''` (10685), igual às tarefas do JARVIS e do Conselho (12157, 11750).
- Problema: toda tarefa criada pelo botão Nova tarefa sai carimbada como Account Manager mesmo quando a pessoa nem tocou no campo. Isso polui o relatório por área (11057, `const fArea=t=>((t.funcao||'').trim())||'Sem área'`) e os contadores de POPs por função (15822 a 15823, `t.funcao===f`), que passam a atribuir ao Account Manager trabalho que ninguém classificou.
- Correção: incluir a opção "Sem função" com valor vazio como primeira do select tk-func e trocar o default do openNovaTarefa de 'Account Manager' pra ''. O gate de POP (Captação e Editor) continua funcionando igual.

## P2

### 11. Bloco morto "Agenda · Junho 2026" ocupando espaço no DOM

- Evidência: `public/workflowark.html:1680` `<div class="page" id="page-agenda-static-old" style="display:none" aria-hidden="true">`, conteúdo "Agenda · Junho 2026" até a linha 1736. Nenhum data-nav, busca ou função aponta pra ela.
- Problema: página estática de junho que ficou pra trás quando a Agenda editável entrou. Peso morto num monolito que já passa de 16 mil linhas, e confunde quem for mexer no arquivo achando que é a agenda de verdade.
- Correção: apagar o bloco inteiro (linhas 1680 a 1736).

### 12. Rótulo congelado "Agenda Junho" na busca global e nas permissões

- Evidência: `public/workflowark.html:9851` `{k:'agenda',l:'Agenda Junho'}` no NAV_CATALOG (segunda passada localizou a mesma entrada em 11345). A busca global filtra por esse label (5946, e o filtro do catálogo também aparece em 7440) e os checkboxes de permissão por membro imprimem ele direto (9944, também referenciado em 11438). A sidebar se corrige sozinha (6294 troca pra 'Agenda ' + mês atual, mesma lógica em 7788).
- Problema: em setembro, a busca e a tela de permissões ainda mostram "Agenda Junho". Buscar "agenda setembro" não acha nada e o admin marca permissão numa aba com nome de três meses atrás. Passa impressão de sistema desatualizado.
- Correção: trocar o label fixo por "Agenda do Mês" no NAV_CATALOG, ou gerar o label na mesma função que já monta "Agenda " + mês.

### 13. Financeiro > Financeiro: subitem repete o nome do grupo

- Evidência: `public/workflowark.html:1795` `<span>Financeiro</span>` (grupo) e `:1801` `<span>Financeiro</span>` (subitem, page-financeiro na 5102). Até o ícone de cifrão é o mesmo nas duas linhas (1794 e 1800).
- Problema: o grupo e o primeiro item têm nome e ícone idênticos. Não dá pra saber se o subitem é visão geral, fluxo de caixa ou extrato sem clicar.
- Correção: renomear o subitem pro que a página entrega (por exemplo "Visão Geral" ou "Fluxo de Caixa") ou fazer o grupo navegar direto pra ela, no padrão de Atividades (1721).

### 14. Régua dos 15 é jargão interno que o rótulo não explica

- Evidência: `public/workflowark.html:1687` `<span>Régua dos 15</span>`. A própria página se descreve como "Matriz semanal · clique nas células para alternar" (3143). Item opcional, escondido por padrão atrás da flag wfa-show-regua (11381).
- Problema: quem não estava na reunião em que a régua nasceu não sabe o que são "os 15". Impacto baixo porque a aba vem desligada por padrão, mas quando o gestor liga, o nome não ajuda ninguém.
- Correção: renomear pra algo autoexplicativo, por exemplo "Checklist Semanal · Régua dos 15", mantendo o apelido como sobrenome.

### 15. Campo "Início" aparece nos 3 formulários de tarefa e nenhuma tela usa o valor

- Evidência: `public/workflowark.html:4655` `<input class="form-input" id="nt-ini" type="date">`, 4751 (td-ini) e 7912 (tk-ini). Default preenchido sozinho: 10695 `ini:hojeSP()` e 10700. Todas as ocorrências de `.ini` no arquivo são só o vai e vem do próprio modal (7709, 7754, 10897, 10926, 10982, 11207): nenhum cartão do kanban, filtro, ordenação, Meu Dia ou relatório lê t.ini.
- Problema: campo que ocupa espaço em três formulários, nasce preenchido com a data de hoje e morre no estado sem efeito nenhum. Quem preenche com carinho desperdiça clique, quem não preenche não perde nada.
- Correção: remover o campo Início dos três formulários (ou passar a usá-lo de verdade, por exemplo pra ordenar a coluna A iniciar ou plotar na Agenda). Manter t.ini no estado pra não quebrar dado antigo.

### 16. Tarefa nova ganha vencimento automático em 3 dias e vira "atrasada" artificial

- Evidência: `public/workflowark.html:10695` `data:dataSP(new Date(Date.now()+3*86400000))` e 10705 `document.getElementById('nt-data').value=dataSP(new Date(Date.now()+3*86400000))`. O quick add da coluna cria sem data (10685, `data:''`).
- Problema: quem cria tarefa pelo modal e não mexe na data recebe um prazo que ninguém definiu. Três dias depois a tarefa aparece vermelha como atrasada no board e no Meu Dia sem nunca ter tido prazo real, o que banaliza o alerta de atraso e empurra o time pro botão de mover atrasadas em massa pra amanhã (adiarAtrasadas), um ciclo de adiamento que não significa nada.
- Correção: deixar o vencimento vazio por default no modal (igual ao quick add) e tratar tarefa sem data como "sem prazo" nos boards. Se quiser manter sugestão, mostrar a data como placeholder e só gravar se a pessoa confirmar o campo.

### 17. Rodar skill no JARVIS abre um prompt bloqueante "opcional" a cada clique

- Evidência: `public/workflowark.html:11961` `var input=prompt('Input pra skill "'+slug+'" (opcional):','')||'';` dentro de jvRun, chamado pelo botão RODAR de cada card de skill.
- Problema: ação de 1 clique vira 2 passos sempre. O navegador trava com um diálogo pedindo um input que o próprio texto diz ser opcional, e apertar Cancelar roda a skill do mesmo jeito (o `||''` engole o null). Confirmação de ação trivial que não muda nada na maioria dos usos.
- Correção: rodar a skill direto no clique e colocar um campo de texto inline opcional no card (ou um botão secundário "Rodar com input") pra quem realmente precisa passar parâmetro.

### 18. Régua dos 15: ciclo de estados conclui e apaga tarefa real no meio do caminho

- Evidência: `public/workflowark.html:10750` a 10763, cycleRegua: `const next=cur===''?'ok':cur==='ok'?'no':cur==='no'?'na':''` e depois `if(next==='ok'){ taskConcluir(t)... } else if(next==='na'){ state.tarefas=state.tarefas.filter(x=>x.reguaKey!==key)... }`.
- Problema: a célula só anda em ciclo: vazio, ok, não, n/a, vazio. Pra marcar "não" a pessoa passa obrigatoriamente por "ok", que conclui a tarefa vinculada de verdade (carimba concluidaEm e dispara o gancho de conclusão) e em seguida reabre. Pra limpar um ✓ dado por engano ela passa por "n/a", que remove a tarefa da lista. Um clique a mais ou a menos altera ou destrói tarefa real do kanban sem aviso.
- Correção: trocar o ciclo por um mini menu de 3 opções no clique da célula (feito, não feito, não se aplica) e só aplicar o efeito colateral na escolha final. Alternativa mínima: só concluir ou remover tarefa se o estado ficar parado por alguns segundos, não a cada passo do ciclo.

### 19. Configurações de equipe: salvar por linha e alteração perdida em silêncio

- Evidência: `public/workflowark.html:9935` renderSettingsTeam gera pra cada membro um botão próprio `onclick="salvarMembro(...)"`, o painel de abas fica colapsado atrás do botão "Abas ▾" (toggleAcc, 9964) e nada marca a linha como alterada. salvarMembro (9980) só grava a linha clicada.
- Problema: ajustar acesso de vários membros exige, por pessoa: abrir "Abas ▾", marcar as caixas e lembrar de clicar Salvar daquela linha, 3 ou mais cliques por membro. Pior: quem marca as caixas de dois ou três membros e clica Salvar só no último perde as outras alterações sem nenhum aviso, porque não existe indicador de pendência nem salvar geral.
- Correção: um botão "Salvar equipe" que percorre todas as linhas alteradas (ou salvar automático ao mudar checkbox, com toast por membro), e destacar a linha com alteração pendente enquanto isso não existir.

## Plano de ataque

Ordem de execução. "Direto" significa correção segura e reversível, sem mudar fluxo que a equipe já usa. "Precisa do seu ok" significa mudança visível de fluxo, rótulo ou comportamento que o time conhece.

Pode corrigir direto:

1. Fechar o furo de acesso: checagem de permissão no handler de navegação (achado 1). Fecha card, busca e voz de uma vez. Ninguém com acesso legítimo perde nada.
2. Card Atendente WhatsApp: badge "Em manutenção", clique desativado, limpar mdwGoWpp e a entrada do navMap do JARVIS (achado 2).
3. Apagar o bloco morto da Agenda de junho, linhas 1680 a 1736 (achado 11).
4. Trocar o label "Agenda Junho" por "Agenda do Mês" no NAV_CATALOG (achado 12).
5. Completar o NAV_CATALOG pra busca global achar todas as páginas, respeitando o RBAC no resultado (achado 7).
6. Persistir grupos do menu abertos e reabrir o grupo pai no restore de página (achado 9).
7. Botão "Salvar equipe" e destaque de linha com alteração pendente nas Configurações (achado 19). Aditivo, o salvar por linha continua funcionando.
8. Trocar o prompt bloqueante do JARVIS por campo inline opcional no card (achado 17).
9. Default de função vazio no modal de tarefa, com opção "Sem função" no select (achado 10). Reversível e alinha o modal ao quick add, que já cria sem função.

Precisa do seu ok antes:

10. Página Pauta: criar a porta de entrada no menu ou remover a feature inteira (achado 3). É decisão de produto, e enquanto isso o pautaAvancar segue rodando por baixo.
11. Pacote de renomes de menu, de uma vez só pra equipe se adaptar uma vez: Estúdio vira "Agentes de IA" (achado 4), "Planejamento de Conteúdo" e "Apresentações de Onboarding" (achado 6), Funil vira "Números do Mês" (achado 8), subitem Financeiro vira "Visão Geral" (achado 13), Régua vira "Checklist Semanal · Régua dos 15" (achado 14).
12. Posição do Organograma: subir pro bloco principal ou expor "Adicionar pessoa" nas Configurações (achado 5).
13. Vencimento automático de 3 dias: deixar vazio por default e tratar "sem prazo" nos boards (achado 16). Muda um comportamento que o time já conhece nos alertas de atraso.
14. Campo Início: remover dos formulários ou passar a usar de verdade (achado 15).
15. Régua dos 15: trocar o ciclo de clique por mini menu de 3 opções (achado 18). Muda a interação de quem já usa a matriz.

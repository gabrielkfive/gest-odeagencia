# Tarefa 07 · Aprovação sem estresse dentro do /app

Doc 11 (21/09), linha 7. Dono: Claude. Prazo: 29/09. Pronto quando: fluxo gravado de ponta a ponta (enviar, cliente aprovar, tarefa concluir).

## O que já existe (medido hoje)
1. Portal público `/portal?t=<token>` com entregas e aprovação (Aprovar e Pedir ajuste gravam na tarefa). Lote 2, commit 190e586.
2. Módulo puro `src/lib/entregas.js` com `derivarEntregas` e `aplicarDecisaoCliente`, testado em `deploy/teste-entregas.mjs`.
3. Área do Cliente no /app com abas; a aba Aprovação hoje é a mesma grade genérica das outras, sem prévia e sem ação.
4. Botão "Link do portal" já gera e copia o link (`nxPortalLink`).

## O que falta (este lote)
Aba Aprovação vira o espelho do portal, do lado de dentro:
1. Cartão por tarefa em `homologcli`, com prévia da mídia no enquadramento do Instagram: reel e story 9:16, feed 4:5, carrossel 1:1, sem mídia mostra o rascunho da legenda.
2. Legenda como o cliente vê, cortada em 125 caracteres com "mais".
3. Data de publicação, formato e há quantos dias está parado.
4. Botão "Enviar ao cliente": gera o link do portal, copia, carimba `enviadoClienteEm` e escreve no histórico da tarefa.
5. Aviso quando falta arquivo: sem anexo o cliente não consegue aprovar nada de verdade.

## Como (TDD onde tem lógica)
Módulo puro novo `src/lib/aprovacao.js`:
1. `derivarAprovacoes(tarefas, cliente, agoraIso)`: mesma regra de dono da tarefa do `entregas.js`, devolve prévia escolhida, proporção, legenda cortada e dias parado.
2. `marcarEnviadoAoCliente(tarefa, agoraIso)`: devolve a tarefa com `enviadoClienteEm` e a linha no histórico, sem duplicar linha no mesmo dia.
Teste primeiro em `deploy/teste-aprovacao.mjs`, no molde do `teste-entregas.mjs`. Só depois a tela.

Tela: `public/workflowark-cliente-<data>.js` (renomear o arquivo com a data nova e trocar a referência no HTML, regra da casa) mais o CSS do mesmo par.

## Prova
1. `node deploy/teste-aprovacao.mjs` e `node deploy/teste-entregas.mjs` verdes.
2. `deploy/prova-aprovacao.py`: carteira sintética com uma tarefa em homologação com imagem, abre a Área do Cliente, aba Aprovação, captura o cartão, clica em Enviar ao cliente, confere o carimbo na tarefa, abre o portal com o token e aprova, confere a tarefa concluída.
3. `npm run teste:mobile`, `npm run build`, push, CI success, marcador na URL de produção.

## Fora deste lote
Tokens Apple (esperam o aval do Gabriel), prévia do feed inteiro, upload de arquivo pela tela.

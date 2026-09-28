# Handoff, segurança do financeiro (Task #8)

Ficou de fora da maratona de 02/07 por ser a mais arriscada. Conferido contra o código
em 28/09/2026: os dois bugs foram tratados; sobra um resto pequeno no Bug #4.

Observação sobre os commits: o clone usado na conferência é raso e começa em 827c703
(17/09). O que aparece "desde 827c703" pode ser um pouco mais antigo; a data vem do
comentário no próprio código.

## Bug #3, `/api/workflowark/sheet` sem login: RESOLVIDO (17/09/2026)
- Servidor: `src/routes/api/workflowark.sheet.ts` chama `isRunAuthorized` antes de
  responder (comentário "Guarda (17/09/2026)", presente desde 827c703). Sem sessão válida
  devolve 401.
- Quem passa: membro ativo com papel admin, gestor ou financeiro
  (`src/integrations/run-auth.server.ts`), ou `?key=` com o segredo RUN_KEY pra cron.
- Front: as 4 chamadas usam `sheetFetch` com o token da sessão
  (`public/workflowark-app-20260926c.js`).
- Detalhe que não é bug: a matriz de papéis da tela Equipe (24/09) não vale pra essa
  rota; ela segue a lista fixa de três papéis.

## Bug #4, estado financeiro sem gate por papel: QUASE TODO RESOLVIDO
- 827c703 (17/09): GET e save-state de `wfa-cobranca` e `wfa-acerto` passaram a
  respeitar o papel (quem não vê não recebe e não grava; gravação vira no-op com 200).
- 39a0d35 e 8272629 (24/09): regra única em `src/lib/permissoes.js`, com a matriz
  Ver/Editar da tela Equipe (`wfa-permissoes`, só admin grava). Entraram também
  `wfa-extratos` e `wfa-acertosrec` no bloqueio de leitura. Teste em
  `deploy/teste-permissoes.mjs`.

### O que ainda falta (pendente de verdade)
- `wfa-fin` e `wfa-planilha` estão na área "financeiro" da matriz, mas NÃO estão em
  `BLOCO_ABA` (`src/lib/permissoes.js`). Resultado: o GET do estado ainda entrega esses
  dois blocos a qualquer membro ativo, e a gravação só é barrada se a matriz desmarcar
  Ver ou Editar da área. Correção provável: incluir as duas chaves em `BLOCO_ABA`
  apontando pra aba "financeiro", testar com um `viewer` e um `admin` e rodar
  `teste-permissoes`. Não foi feito nesta conferência (só docs).

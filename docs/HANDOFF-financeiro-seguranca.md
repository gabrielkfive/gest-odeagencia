# Handoff, segurança do financeiro (Task #8, não feita)

Ficou de fora da maratona de 02/07 por ser a mais arriscada (mexe em front e
servidor juntos e pode tirar o financeiro de quem tem direito). Fazer numa
fatia dedicada, com build e teste.

## Bug #3, `/api/workflowark/sheet` sem login
Hoje qualquer um lê o CSV do fluxo de caixa. O front chama em 4 lugares
(`workflowark.html` ~9078, ~9088, ~9295, ~9317) sem token.
Plano: criar um `sheetFetch(url)` no front que pega `access_token` da sessão
Supabase (igual `directCloudCall`) e manda `Authorization: Bearer`; no servidor,
`src/routes/api/workflowark.sheet.ts`, validar a sessão (mesmo `getUser` do
`state.ts`) antes de responder. Cuidado: durante o seed a sessão pode ainda não
estar pronta, tratar erro sem quebrar a tela.

## Bug #4, estado financeiro sem gate por papel
`state.ts` GET devolve `wfa-fin`/`wfa-cobranca`/`wfa-acerto` pra qualquer membro
e `save-state` deixa qualquer um escrever. O filtro só exclui `-secret`/`-oauth`.
Plano: definir as chaves sensíveis e os papéis que podem ver (alinhar com o
`memberAccess` do front, ~6212), filtrar no GET e barrar no `save-state`. O front
já esconde a UI por papel, então a ausência do bloco não quebra quem não tem
acesso. Testar com um usuário `viewer` e um `admin`.

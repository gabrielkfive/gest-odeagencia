# Equipe da V3 no WorkFlowArk original

**Objetivo:** levar a tela Configurações > Equipe da V3 (membros, convites pendentes, papéis e
permissões com Ver e Editar) para a aba Equipe e Acessos do app original.

**Arquitetura:** regra pura em `src/lib/permissoes.js` (servidor e teste), cópia idêntica em
`public/workflowark-permissoes-20260924a.js` (navegador, carregada como módulo). Matriz salva
na linha `wfa-permissoes` do `workflowark_state`, só por admin, pela ação `save-permissoes`.
A chave fica fora de `STATE_KEYS`, então ninguém grava por `save-state`.

## Regras

- Padrão da matriz = acesso de hoje (ROLE_ACCESS). Nada muda até o admin mexer.
- Precedência: padrão do papel, depois matriz do papel, depois ajuste da pessoa (só o que
  difere do padrão do papel), admin sempre tudo.
- Servidor: Ver fecha `wfa-cobranca` e `wfa-acerto` no GET e no POST. Editar falso transforma
  `save-state` e `save-many` do bloco da área em no-op com `ignorado`. `save-many` passa a
  respeitar Ver também (antes gravava qualquer bloco).
- Convite continua pelo e-mail pré-autorizado (sem rota pública nova). Pendente = membro sem
  `user_id`. Cancelar = remover o membro pendente.
- Sem travessão em texto de interface.

## Tarefas

1. Teste `deploy/teste-permissoes.mjs` (falha), depois `src/lib/permissoes.js`, cópia pública
   idêntica (o teste compara os dois arquivos).
2. Servidor `workflowark.state.ts`: `lerMatriz`, `podeVerBloco` e `podeEditarBloco` com a
   matriz, `save-permissoes`, `created_at` na lista de membros.
3. Front: `memberAccess` usa o módulo; sync lê `wfa-permissoes` e avisa quando o servidor
   ignora gravação; aba Equipe no layout da V3 (Membros, Convites pendentes, Papéis e
   permissões). Arquivos renomeados com data e marcador de build novo.
4. Provas: testes, build, `teste:mobile`, screenshot local claro e escuro lado a lado com a V3,
   push, CI verde, marcador em produção.

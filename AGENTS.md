# AGENTS.md · como um agente de IA trabalha no WorkFlowArk

Regras para qualquer agente (Claude Code, Codex, Hermes) que mexe neste repositório.
Segurança vem antes de tudo: o sistema guarda a operação real da ARK (clientes, CRM,
tarefas, financeiro) e está sendo anunciado para agências de fora.

## Antes de começar

1. `git pull` e trabalhar em worktree a partir de `origin/main` quando a pasta principal
   tiver alteração de outra sessão.
2. Ler, nesta ordem: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`,
   `CLAUDE.md` (guardrails de operação) e `specs/system.md` se mexer em sync.
3. Procurar componente, módulo ou teste parecido antes de criar um novo.

## Regras de segurança (inegociáveis)

1. **Toda autorização é no servidor.** Esconder aba no front não protege nada. Quem não pode
   ver um bloco `wfa-*` não recebe esse bloco no GET e não grava no POST
   (ver `podeVerBloco` em `src/routes/api/workflowark.state.ts`).
2. **Conta nova fica pendente.** Quem cria conta sem convite entra com `active: false` e não lê
   nada até o admin liberar. Regra única em `src/lib/acesso.js`, teste em
   `deploy/teste-acesso.mjs`. Nunca voltar a "entra na hora como viewer".
3. **Não existe multi-agência ainda.** Todo dado mora numa tabela só (`workflowark_state`).
   Não dar acesso de teste a agência de fora dentro desta instância. Teste externo só em
   instância separada ou depois do isolamento por `tenant_id` (ver PRD, fora de escopo).
4. **Segredo só em variável de ambiente do Worker** (`wrangler secret`), nunca no código, no
   `public/`, em log, em commit ou em resposta de API. Blocos `wfa-*-secret`, `wfa-*-oauth` e
   `wfa-portal-tokens` nunca voltam do servidor para o navegador.
5. **Rota pública precisa de dono explícito.** Rota sem login (portal, aprovação, lead-site,
   webhooks) valida entrada, limita tamanho, usa token criptográfico e só grava o bloco que
   precisa. Rota nova sem login exige revisão de segurança antes do deploy.
6. **Validar toda entrada** (tipo, tamanho, formato) e responder erro genérico; detalhe só no
   log do servidor, sem dado pessoal.
7. **Dado de cliente real não sai do sistema:** print de landing, demo e material de venda usam
   agência e clientes fictícios. Nome de cliente real só com autorização do Gabriel.
8. **Nada criado sozinho:** agente não cria tarefa, cartão, notificação ou mensagem para cliente
   sem aprovação humana. Robô prepara, fila recebe, humano aprova.

## Regras de código

1. Lógica nova em módulo puro (`src/lib/*.js`) com teste em `deploy/teste-*.mjs` escrito antes.
2. Arquivo do app com data no nome: mudou o conteúdo, renomeia (`git mv`), troca a referência
   no HTML e o marcador `<!-- build AAAAMMDDx-tag -->`.
3. Lista sincronizada nova entra em `WFA_CLOUD_KEYS`, `STATE_KEYS` e, se tiver id, nas chaves de
   mescla. `npm run teste:merge` e `node deploy/teste-chaves-sync.mjs` provam.
4. Texto de interface e de documento em português simples, sem travessão.

## Comandos

```
npm ci                         instala
npm run build                  tem que passar antes de qualquer deploy
node deploy/teste-acesso.mjs   regra de conta nova
npm run teste:mobile           obrigatório ao mexer no public/workflowark.html
npm run teste:confiabilidade   obrigatório ao mexer em tarefa, arrasto ou sync
npm run teste:arrastar
npm run teste:merge
```

## Fronteiras (pedir aprovação do Gabriel antes)

- Mudar papel, permissão, RLS, rota pública ou qualquer regra de acesso.
- Adicionar dependência nova ou serviço externo.
- Deploy em produção: sempre commit + push (o CI publica), conferir `gh run list` e o marcador
  na URL real antes de dizer que está no ar.
- Apagar dado, chave de estado ou membro.

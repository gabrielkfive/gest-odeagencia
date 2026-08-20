---
name: gest-odeagencia-patterns
description: "Use when working in the gest-odeagencia (WorkFlowArk) repo, especially before writing a commit, touching public/workflowark.html or src/routes/api/workflowark.state.ts, adding a test, or shipping to production. Conventions measured from 182 commits of git history."
metadata:
  version: "1.0.0"
  source: local-git-analysis
  analyzed_commits: "182"
---

# WorkFlowArk (gest-odeagencia) Patterns

Convenções medidas no histórico real do repositório, não em boas práticas genéricas.
As regras de operação (sistema no ar, deploy, custo, mobile) já estão no `CLAUDE.md`
da raiz. Este arquivo cobre o que o `CLAUDE.md` não descreve.

## Convenções de commit

Medição sobre os 182 commits de `main` (atualizada em 20/08/2026):

| Formato | Commits | Fatia |
|---|---|---|
| Frase em português descrevendo o resultado | 101 | 55% |
| Prefixo minúsculo (`fix:`, `feat:`, `docs:`...) | 61 | 34% |
| Prefixo de domínio capitalizado (`Sync:`, `Kanban:`, `API:`...) | 20 | 11% |

O padrão dominante **não** é conventional commits. É uma frase curta em português
que descreve a mudança do ponto de vista de quem usa o sistema, com o detalhe
técnico entre parênteses quando existe.

Exemplos reais do repo:

- `Jornada: restaura o mapa salvo no boot (cliente movido de sprint nao volta mais)`
- `Propostas de tarefa com 7+ dias expiram sozinhas (sino sai do 99+ de vez)`
- `Kanban: '+ Adicionar cartao' ancorado no fundo da coluna de verdade`

Quando usar prefixo minúsculo, os que aparecem no histórico são
`fix:` (25), `feat:` (22), `docs:` (6), `ux:` (3), e um de cada:
`test:`, `security:`, `refactor:`, `perf:`, `chore:`.

Regras práticas:

1. Escreva o efeito visível, não o arquivo mexido. `Sino de notificacoes sano`
   vale mais que `atualiza componente de notificação`.
2. Prefixo de domínio (`Sync:`, `Comercial:`, `Jornada:`) quando a mudança é
   claramente de uma área do produto.
3. `fix:` e `feat:` para mudança técnica sem recorte de produto.
4. Sem travessão no assunto. Um commit do histórico existe justamente para
   tirar travessão do onboarding.

## Arquitetura e arquivos quentes

Frequência de alteração nos últimos 200 commits:

| Arquivo | Commits | O que é |
|---|---|---|
| `public/workflowark.html` | 107 | O produto inteiro em um HTML de 1 MB, front-end monolítico |
| `src/routes/api/workflowark.state.ts` | 23 | API de estado, 90 KB, coração do sync |
| `src/routes/os.tsx` | 12 | ArkOS V2 |
| `src/routes/api/workflowark.agents-run.ts` | 11 | Execução dos agentes de IA |
| `src/components/arkos/dados.ts` | 8 | Dados do ArkOS |

Consequências que o histórico mostra:

- `public/workflowark.html` concentra mais da metade das mudanças. É um arquivo
  único com HTML, CSS e `<script>` inline. Editar sempre por trecho, nunca
  reescrever o arquivo.
- Todo `<script>` inline alterado precisa passar por `node --check` no bloco
  extraído antes do deploy. Já houve quebra em produção por escape de aspas em
  template literal.
- `src/routes/api/` usa nomenclatura plana com ponto: `workflowark.state.ts`,
  `workflowark.bridge.ts`, `workflowark.whatsapp.webhook.ts`. Rota nova segue
  o mesmo prefixo `workflowark.`.
- `src/routeTree.gen.ts` é gerado. Aparece em 11 commits sempre junto com rota
  nova, nunca sozinho, e não se edita à mão.

## Fluxos que se repetem

Arquivos que mudam junto com `public/workflowark.html` nos últimos 60 commits:

1. `docs/MELHORIAS.md` (7 vezes). Mudança de produto entra também no registro de
   melhorias. É o par mais forte do repositório.
2. `src/routes/api/workflowark.state.ts` (4 vezes). Campo novo no front quase
   sempre pede chave nova no estado. Chave nova precisa entrar em `STATE_KEYS`,
   senão não sincroniza.
3. `src/components/arkos/ui.tsx` (2 vezes).

Sequência observada em mudança de funcionalidade:

`public/workflowark.html` → `src/routes/api/workflowark.state.ts` → `docs/MELHORIAS.md` → commit + push

## Testes

Não existe `tests/` nem framework de teste. O padrão do repositório é script
`.mjs` avulso em `deploy/`, rodado com `node`:

- `deploy/teste-mobile-drawer.mjs`, exposto como `npm run teste:mobile`.
  Obrigatório em qualquer mudança no `workflowark.html`, existe por causa de um
  incidente de sidebar travada no celular.
- `deploy/teste-fixes-jul23.mjs`, `deploy/teste-novos-fixes.mjs`,
  `deploy/teste-decisoes.mjs`, teste de fumaça por leva de correções.
- `deploy/test-sync-race.mjs`, fuzz do merge de estado. O commit
  `Solido v2` cita fuzz de 1500 operações passando.
- `deploy/shot-producao.mjs`, screenshot da URL de produção.

- `deploy/teste-guarda-sessao.mjs`, guarda de sessão. Exige as duas coisas: cache
  sincronizado limpo sem login E dado só local intacto.
- `deploy/teste-chaves-sync.mjs`, estático, confere que as listas de chaves do
  cliente e do servidor concordam.

Teste novo aqui é um `.mjs` em `deploy/` nomeado pelo que ele cobre, não um
arquivo espelhado ao lado do código. Se ele aceitar uma URL como primeiro
argumento, roda também contra produção, e é assim que o CI usa.

**Teste de regressão só vale se reprovar a versão anterior.** A convenção neste
repo é provar isso na hora: rodar o teste contra o arquivo do `HEAD` antes de
commitar. Teste que passa nos dois lados não guarda nada.

## Deploy e verificação

- CI em `.github/workflows/deploy.yml`, dispara em push para `main`, roda
  `npm ci`, `npm run build` e `wrangler-action` (wrangler pinado em 4.125.0).
- Depois do deploy, o CI confere o marcador de build na URL de produção e roda os
  testes de navegador contra o site no ar, num job `testes-producao` separado que
  NUNCA bloqueia a subida. Vermelho ali é aviso de regressão, não porta fechada.
- Push para `main` deploya. Não existe branch de staging no histórico.
- O repositório tem convenção própria de marcador de build: commits como
  `Marcador de build 2026-07-27-recupera-maratona-23-07` gravam uma string de
  versão na página para conferir na URL de produção qual build está no ar.
  Aparece 4 vezes no histórico, sempre depois de incidente de deploy silencioso.
- 4 commits citam explicitamente a URL de produção no assunto. "Pronto" no
  histórico deste repo significa conferido na URL, não comando rodado.

## A armadilha mais cara deste repo: duas listas que precisam concordar

Este projeto guarda várias listas paralelas que só funcionam se estiverem em
sincronia, e nada avisa quando saem do lugar. Já custou semanas de sintoma:

| Lista | Onde | Precisa concordar com |
|---|---|---|
| `WFA_CLOUD_KEYS` | `workflowark.html` | `STATE_KEYS` no servidor |
| `WFA_NO_PUSH` | `workflowark.html` | as chaves server-owned |
| `WFA_MERGE_KEYS` | `workflowark.html` | `WFA_CLOUD_KEYS` |
| `isSensitive` | `workflowark.state.ts` | não pode pegar chave de sync |

Caso real de 20/08: `wfa-notif-read` estava na lista do cliente e não no servidor.
Todo save voltava "Bloco inválido" e a fila descartava em silêncio, então marcar
notificação como lida nunca atravessava de aparelho. `deploy/teste-chaves-sync.mjs`
trava esses invariantes; rode antes de mexer em qualquer uma dessas listas.

Regra geral que vale para o arquivo inteiro: **nunca duplicar uma lista**. Quando
a guarda de sessão do `<head>` precisou saber quais chaves sincronizam, a lista foi
publicada pelo app em `wfa-sync-keys` a partir de `WFA_CLOUD_KEYS`, em vez de
copiada. Fonte única ou o problema volta.

## Armadilhas registradas no histórico

- Deploy que roda e não sobe. O secret `CLOUDFLARE_API_TOKEN` não existia entre
  03/07 e 27/07, o push não deployava e ninguém percebeu. Conferir o run do
  GitHub Actions, não só o push.
- `wfa-whatsapp` já derrubou o worker duas vezes (erro 1102, limite de recurso)
  por regravar blob grande a cada mensagem. Consulta a estado grande no Worker
  pede filtro, não `GET` completo.
- Merge entre Mac e PC já gerou trabalho em cima de versão velha. `git pull`
  antes de editar.
- Cron no Worker NÃO funciona. Adicionar `scheduled` em `src/server.ts` mais
  `[triggers]` no `wrangler.toml` passa no build, aparece no `wrangler.json` gerado
  e no bundle, e mesmo assim nunca é chamado: o Nitro só aproveita `hooks.fetch` do
  nosso entry. Testado e desfeito em 20/08. Agendamento tem que vir de fora, por
  HTTP com a `RUN_KEY`.
- Limpeza de cache local só pode atingir chave que a nuvem devolve. Das 59 chaves
  `wfa-*`, 25 vivem só no aparelho, e `wfa-rotina-checks`, `wfa-allhands` e
  `wfa-cons-chat-*` guardam trabalho de verdade. Apagar é perda definitiva.
- `.github/workflows/deploy.yml` grava a chave anon do Supabase e o account ID
  em texto no arquivo. A chave anon é pública por design, o account ID é de
  baixa sensibilidade, mas vale mover para secrets se o repo virar público.

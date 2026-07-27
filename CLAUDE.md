# Agency Sync Hub — WorkFlowArk

## ⚠️ REGRAS DE OPERAÇÃO (guardrails — ler antes de qualquer mudança)

Estamos numa fase de grandes melhorias. Estas regras existem para NÃO vacilar:
o sistema está em produção sendo usado pela equipe da ARK todos os dias.

### 1. O sistema NUNCA pode sair do ar (regra nº1, acima de tudo)
- Nenhuma mudança vale derrubar produção. Na dúvida entre "rápido" e "seguro", escolha seguro.
- `npm run build` TEM que passar antes de qualquer deploy. Build quebrado = não deploya.
- Mudanças grandes vão em fatias pequenas e verificadas, nunca num bloco só.
- Feature nova vai em rota React, não no monolito `public/workflowark.html` (9.6k linhas,
  congelado como legado — refatorar só aos poucos e com cuidado).

### 2. Deploy = SEMPRE commit + push junto (gotcha de durabilidade)
- O CI (`.github/workflows/deploy.yml`) faz deploy a cada push e RECONSTRÓI do git.
  FUNCIONANDO desde 27/07/2026 (secret CLOUDFLARE_API_TOKEN configurado; antes disso
  o secret nunca existiu e TODO push falhou em silêncio de 03/07 a 27/07, deixando
  produção 4 dias sem os fixes do financeiro da maratona de 23/07).
- `npx wrangler deploy` manual SEM commit é revertido no próximo push de qualquer pessoa.
- Portanto: todo deploy manual vem acompanhado de commit + push na hora. Nunca deixar
  o estado "no ar" diferente do que está no git.
- Push feito? Confira o run: `gh run list --limit 1` TEM que terminar "success" antes
  de dizer que está no ar; a verificação do marcador na URL continua valendo
  (skill deploy-verificado). Falha silenciosa de CI foi exatamente o buraco de julho.

### 3. Equilíbrio de tokens (custo sob controle)
- Toda chamada de IA com prompt caching no `system` (~80% menos custo de input).
- Rate-limit por usuário nos agentes de geração; nada de Sonnet liberado pra qualquer role.
- Trabalho do Claude também: não ler arquivos gigantes sem precisar, não disparar agentes
  à toa. Economia é parte do "não vacilar".

### 4. Tudo registrado no Obsidian
- Decisões, melhorias e o que rodou vão pro vault `Documents\Obsidian Vault`
  (Diário do dia + nota da frente correspondente). O Gabriel acompanha por lá.

### 5. Antes de afirmar "pronto/funcionando"
- Verificar de verdade (build, e quando dá, Playwright). Evidência antes de afirmar.

### 6. Mobile é produção (metade da equipe usa pelo celular)
- Mexeu em CSS/JS do `public/workflowark.html`? Rode `npm run teste:mobile` antes do deploy.
  Ele confere em viewport de celular (dark e light) que o menu lateral começa escondido,
  abre pelo hamburger e fecha na seta de voltar. Incidente de jul/26: animação de entrada
  com `animation-fill-mode: both` congelou `transform:none` e prendeu a sidebar aberta
  no celular por dias.
- Animação de entrada em elemento de layout (sidebar, topbar, drawer) SEMPRE dentro de
  `@media (min-width:901px)`. Fill "both"/"forwards" em transform atropela o estado
  escondido do mobile pra sempre, porque animação CSS ganha de regra normal.
- Correções de segurança e de perda de dado têm prioridade sobre feature nova.

## Dono do projeto
Gabriel Andrade — dono da ARK Content (agência de marketing de gastronomia). Não é desenvolvedor. Quer o software funcionando em produção, sem precisar entender o código. Falar sempre em português, linguagem simples e direta.

## O que é o projeto
Hub operacional para a equipe da ARK Content. Integra tarefas, finanças, OKRs, calendário, clientes, demandas, rotinas e processos. Tem autenticação com Google OAuth e persiste estado no Supabase.

## Stack
- React 19 + TanStack Start/Router
- Vite + Bun (ou npm)
- Supabase (auth + PostgreSQL)
- Cloudflare Workers (deploy via Nitro)
- shadcn/ui + Tailwind CSS

## Como rodar localmente
```bash
npm install
npm run dev
# Abre em http://localhost:5173
```

## Como fazer build
```bash
npm run build
```

## Deploy
- Plataforma alvo: Cloudflare Workers
- O comando `npm run build` gera os arquivos para deploy
- Variáveis de ambiente necessárias: estão no `.env` (Supabase URL e chaves)

## Estrutura principal
- `src/routes/` — páginas (auth, app principal, APIs)
- `src/integrations/supabase/` — conexão com banco e autenticação
- `public/workflowark.html` — interface principal do sistema (arquivo único de 149KB)
- `src/routes/api/` — endpoints do servidor

## Banco de dados (Supabase)
- Projeto: fxfnonozzekxnxddxsnh.supabase.co
- Tabelas: `workflowark_members`, `workflowark_state` (RLS travado: tudo passa pelo servidor via service_role)
- Auth: email/senha (exige confirmação de e-mail) + Google OAuth

## Produção
- Domínio: https://workflowark.arkcontent.workers.dev
- Deploy: `npm run build` depois `npx wrangler deploy`
- IMPORTANTE: o servidor lê SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY via `cloudflare:workers` (ver `src/integrations/supabase/client.server.ts`). `process.env` fica vazio nesse runtime.
- A interface principal é `public/workflowark.html` (carregada em iframe pelo app React em `/app`, que repassa o token via postMessage)

## Prioridade atual
Colocar o software rodando em um domínio acessível pela equipe da ARK Content.

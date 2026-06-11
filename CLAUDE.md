# Agency Sync Hub — WorkFlowArk

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

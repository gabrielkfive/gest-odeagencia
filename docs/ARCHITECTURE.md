# Arquitetura · WorkFlowArk

## Mapa

```
Navegador
  /app (React, TanStack Start)  carrega  public/workflowark.html em iframe
        |  token da sessão via postMessage
        v
Cloudflare Worker (Nitro)  src/routes/api/*
        |  service_role, só no servidor
        v
Supabase: auth + workflowark_members + workflowark_state (RLS travado)
```

Serviços externos: Google OAuth e Agenda, Meta (Instagram), Anthropic (agentes),
Evolution API (WhatsApp, fora do ar desde 06/09), GitHub Actions (deploy).

## Stack

React 19, TanStack Start/Router, Vite, Nitro 3 em Cloudflare Workers, Supabase (auth e
Postgres), shadcn/ui e Tailwind nas rotas React, HTML e JS clássico no monolito `public/`.

## Pastas

```
src/routes/            páginas React e rotas de API (src/routes/api/)
src/lib/               módulos puros testáveis (acesso, aprovacao, entregas, merge-estado)
src/integrations/      Supabase cliente e servidor, fila remota
public/                monolito do /app (workflowark.html + workflowark-app-<data>.js)
deploy/                testes (teste-*.mjs) e provas visuais (prova-*.py)
docs/                  PRD, arquitetura, design system, planos
```

## Fluxo de uma requisição

1. O front manda `Authorization: Bearer <JWT do Supabase>`.
2. `getContext` valida o JWT com `auth.getUser` e busca o membro em `workflowark_members`.
3. Sem membro: cria pendente (`src/lib/acesso.js`) e devolve 403 `pending`.
4. Membro ativo: o GET devolve os blocos `wfa-*` que o papel pode ver (`podeVerBloco`);
   o POST só grava o que o papel pode gravar.
5. Automação do dono usa o header `x-run-key` (segredo `RUN_KEY`), nunca query string.

## Segurança por camada

- **Banco:** RLS travado; só o Worker fala com o Supabase via service_role
- **Autenticação:** JWT do Supabase; conta nova pendente até liberação
- **Autorização:** papel do membro checado no servidor, bloco a bloco
- **Rotas públicas:** token criptográfico por cliente (portal, aprovação); lead-site só grava no CRM
- **Segredos:** `wrangler secret`; blocos `-secret`, `-oauth`, `portal-tokens` nunca voltam ao navegador
- **Página estática:** guarda de sessão no `workflowark.html` não pinta dado sem sessão

## Dados

`workflowark_state` é chave e valor: cada `wfa-*` é um JSON. Listas mesclam por item pelo
carimbo `up`; exclusão vira lápide. Backup diário `wfa-backup-AAAAMMDD`, 14 dias.
**Limite conhecido:** uma instância, uma agência. Multi-agência exige `tenant_id` em todo
bloco e RLS por tenant antes de qualquer cliente externo.

## Deploy

Push em `main` dispara `.github/workflows/deploy.yml`: build, `wrangler deploy`, espera o
marcador `<!-- build ... -->` na URL e roda os testes Playwright contra produção.
Produção: `https://workflowark.arkcontent.workers.dev`. Landing: Worker `workflowark-v2`.

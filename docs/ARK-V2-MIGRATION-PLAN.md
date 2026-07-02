# ARK V2 · Migration Plan

Versão: 1.0
Data: 02/07/2026
Base: Foundation Document ARK V2 + auditoria completa do repositório
Regra número 1: produção é sagrada. Nada aqui quebra o que já funciona.

---

# PARTE 1 · DIAGNÓSTICO DO SISTEMA ATUAL

## 1. Current Architecture Review

**O que existe hoje:**

- Stack: TanStack Start (React 19) rodando em Cloudflare Workers via Nitro, com Supabase Postgres como banco. Deploy automático via GitHub Actions no push para `main`.
- O produto real NÃO é o app React. É um monólito de **10.585 linhas** em um único arquivo estático, `public/workflowark.html`, carregado dentro de um `<iframe>` pela rota `src/routes/_authenticated/app.tsx`, que faz ponte de autenticação via `postMessage`.
- 15 rotas de API em `src/routes/api/` (state, agents-run, social-run, whatsapp, google, portal, approve, etc.).
- Persistência: uma única tabela `workflowark_state` (chave → blob JSON) com ~40 chaves `wfa-*`, mais `workflowark_members`. Não há schema real por domínio. Todo acesso passa pelo service role (RLS existe mas é contornada).
- Cloudflare quase não é usado como plataforma: sem KV, D1, R2, Durable Objects, Queues, Vectorize ou cron nativo. O Worker é basicamente um host SSR + proxy do Supabase.
- Agendamento: endpoints GET protegidos por `?key=ark-2026` (chave fraca, hardcoded e duplicada em 2 arquivos), pingados por cron externo.

**Veredito:** a fundação (Workers + Supabase + React) é boa e deve ser mantida. O problema é que 90% do produto vive fora dela, num arquivo HTML gigante que ninguém consegue testar, componentizar ou evoluir com segurança. A arquitetura está bifurcada.

## 2. UI Review

- 35 telas de navegação e ~37 containers `.page` dentro do monólito, com router caseiro por show/hide (`data-nav` + `.page.active`).
- Telas principais: Meu Dia, Meu Painel, Clientes (lista, jornada, régua, comercial, Squad Alpha), Atividades/Demandas/Rotinas, OKRs, Financeiro/Cobrança/Acerto, Central de Agentes (JARVIS, Conselho, Planejamento, Roteirista, Legendas), WhatsApp, CRM, Meu Mês, All Hands, War Room.
- Páginas públicas em React separadas: `portal.tsx`, `aprovar.tsx`, `postagens.tsx`, `auth.tsx`, cada uma com estilos inline duplicados.
- A identidade visual é forte e intencional: off-white quente + amarelo `#FFC700` no app interno, dark + dourado `#E3B341` + Playfair Display nas páginas de cliente. Isso é um ativo, não um problema.

**Veredito:** cobertura funcional impressionante e marca reconhecível, mas renderização por concatenação de strings em `innerHTML`, sem camada de componentes. Cada tela reimplementa cards, tabelas e badges à mão.

## 3. UX Review

- Pontos fortes: badge de sync tolerante (só alarma após 3 falhas seguidas), fila de aprovação humana em tudo que toca cliente, botões de sincronizar manual, PWA instalável, drawer mobile funcional.
- Pontos fracos contra o Foundation Document:
  - Loading é texto ("Carregando…", "Sincronizando…") em vez de skeleton, streaming ou progresso narrado ("Consultando memória…"). Viola o Principle 007 (No Loading Spinners vira "no waiting", e hoje há espera muda).
  - Polling de 6s em vez de tempo real. O usuário percebe atraso.
  - Sem command palette nem navegação por teclado (assinatura Linear/Raycast).
  - Mobile é desktop encolhido, não experiência própria.
  - Empty states são ad-hoc, não ensinam nem convidam à ação (viola Principle 018).
  - Não existe a noção de Missão/Operação observável. Agentes rodam e o resultado "aparece" em notificações.

## 4. Motion Design Review

- O monólito tem 17 `@keyframes` e um boot splash genuinamente premium (zoom 3D, logo, letras em stagger). Respeita `prefers-reduced-motion` (3 pontos, incluindo kill-switch global).
- Tokens de motion existem (`--ease`, `--t-fast/-t/-t-slow`), o que é raro e valioso.
- Faltando contra a AML (Ark Motion Language): transições entre telas são show/hide seco (nada "chega", tudo "aparece"), sem continuidade de layout, sem física/spring, sem streaming visual do trabalho dos agentes, sem timeline de missão, sem "workspace que respira" (status de agentes, memória, infra).

## 5. Component Review

- Não existe camada de componentes no produto real. Dezenas de funções `render*()` geram HTML por string.
- Existe uma biblioteca shadcn/ui completa (48 componentes, ~4.360 linhas) em `src/components/ui/`, **100% morta**: nenhuma rota importa nada dela. É o esqueleto perfeito do futuro design system, já instalado e sem uso.
- Duplicação entre as 3 páginas públicas React: paleta, cards e botões copiados e colados; tipos `Ideia`/`Approval` redeclarados em cada arquivo.

## 6. Runtime Review

- Entry: `src/server.ts` (wrapper fino com normalização de erro 500) → TanStack Start SSR.
- Bindings: apenas `ASSETS` e `AI` (Workers AI, Whisper). Sem `[triggers]`, sem domínio customizado (roda em `workflowark.arkcontent.workers.dev`).
- A lógica de "cron" se auto-encadeia com `fetch` para si mesma (fire-and-forget frágil).
- Dois lockfiles (bun + npm), nome do pacote ainda é o scaffold (`tanstack_start_ts`).

## 7. AI Architecture Review

- Provider: API Anthropic direta. Modelos hardcoded em cada arquivo: `claude-haiku-4-5` (triagem WhatsApp, conselho, social, JARVIS) e `claude-sonnet-4-6` (roteirista, planejamento, legenda, Vivenda).
- **Prompt caching só existe em 1 dos ~15 call sites** (`social-run.ts`). O guardrail do CLAUDE.md ("toda chamada com caching") não está implementado. Dinheiro sendo deixado na mesa.
- Nenhuma chamada usa streaming. Tudo bloqueante, o usuário espera em silêncio.
- Sem rate limit por usuário. As proteções reais são: pré-filtro `worthAnalyzing()`, idempotência por dia, lote de 3 clientes por rodada e Sonnet restrito a ações de geração.
- Bom: parser com reparo de JSON truncado, erros nunca derrubam o webhook, disciplina de custo por design.
- Ruim: prompts todos hardcoded como strings, com duplicação que já está divergindo (`CLIENTES_CTX` copiado em `agents-run.ts` e `social-run.ts`, prompt do conselho em 2 lugares, persona JARVIS em 2 lugares).

## 8. MCP Review

- Não há MCP no app deployado. O "whatsapp-mcp" é um relay whatsmeow, e o jarvis-os é um runner local de skills (polling em `localhost:8787`), offline por padrão e fora deste repositório.
- Conclusão: a visão de integrações plugáveis existe em texto, não em arquitetura. V2 precisa de uma camada de tools/integrações com contrato único (onde MCP entra naturalmente).

## 9. Skills Review

- Os "agentes" atuais são rotas + prompts, não skills registráveis. Não há registry, versionamento, permissões nem catálogo. O jarvis-os local tem o conceito certo (skills executáveis com runs), mas desconectado do produto.

## 10. Memory Review

- Conhecimento = briefs por cliente hardcoded em `src/integrations/clientes.ts` (11 clientes) injetados nos prompts, + `wfa-jarvis-memory` (lista plana de fatos, últimos 40 a 60 itens), + `wfa-conselho-briefings` (histórico do conselho, retenção 14 dias).
- **Não existe RAG, embeddings, busca semântica nem grafo de conhecimento.** Nada conecta conversas de WhatsApp, criativos que performaram, decisões do conselho e briefs. "Knowledge is connected" do Foundation Document está em 0%.

## 11. Performance Review

- O monólito de 831 KB é baixado inteiro no primeiro load (dentro de iframe). Sem code-splitting possível.
- Polling full-state a cada 6s multiplica leituras no Supabase; WhatsApp a cada 3,5s.
- Chamadas de IA bloqueantes sem streaming = percepção de lentidão exatamente onde o produto deveria parecer mais vivo.
- Pontos bons: pausa de polling com aba oculta, timeout de 25s com AbortController, flush no `visibilitychange` para mobile.

## 12. Folder Structure Review

- `src/` razoavelmente organizado (routes, integrations, lib, hooks), mas:
  - `_BACKUP-versao-funcional-2026-06-08/` é um snapshot completo do projeto commitado dentro do repo, **com `.env` próprio** (código duplicado + credencial espalhada).
  - Arquivos soltos na raiz: `_import-para-colar.txt`, `_import-tarefas-antigas.json`, `dist/`, `.output/`, `.tanstack/`.
  - Dados de domínio (catálogo de clientes, roteamento por pessoa) embutidos em código de rota.

## 13. Design System Review

- Existem 2,5 design systems desconectados:
  - (A) Tokens do monólito (`:root`, linhas 13 a 40): amarelo `#FFC700`, escala de sombras, raios, motion tokens. Bem pensado, mas preso a 1 arquivo, light-only.
  - (B) Dark/gold das páginas públicas (`#E3B341`, Playfair), constantes copiadas em 3 arquivos.
  - (C) Sistema oklch + shadcn em `src/styles.css`, completo e morto.
- Não há dark mode no app interno, não há pacote de tokens compartilhado, não há biblioteca de componentes viva.

## 14. Technical Debt Report

Em ordem de gravidade:

1. **Monólito** `public/workflowark.html` (10.585 linhas, maior que todo o resto do código somado). Editado hoje e não commitado. CLAUDE.md o congela como legado, mas ele continua crescendo.
2. **Backup completo commitado** com `.env` dentro (`_BACKUP-versao-funcional-2026-06-08/`).
3. **`RUN_KEY = "ark-2026"`** hardcoded e duplicado protegendo os endpoints dos agentes autônomos, com a URL de exemplo escrita em comentário.
4. **Tabela única key/JSON** como banco inteiro, com histórico documentado de corridas de sync e perda de dados (os comentários em `workflowark.state.ts`, 1.025 linhas, contam a história).
5. Prompt caching prometido e não implementado (custo), prompts e catálogo de clientes duplicados e divergindo.
6. shadcn inteiro como código morto, paleta pública triplicada, lógica cloud/token escrita 2 vezes (shell e monólito).
7. Sem cron nativo, sem observabilidade estruturada, sem testes.
8. Dois lockfiles, nome de pacote scaffold, chave anon do Supabase repetida em `wrangler.toml`, CI yaml e `.env`.

## 15. O que JÁ está à altura da visão V2 (preservar a todo custo)

- **O motor de sync** (fila dirty, janela de autoridade local de 15s, merge por id, tombstones, poison-key, badge tolerante). Melhor que muito SaaS grande. Vira módulo TypeScript compartilhado na V2, nunca reescrever do zero.
- **Postura human-in-the-loop**: nenhum agente dispara nada para cliente sem aprovação. É exatamente o "Ark executa, humanos decidem".
- **Sociedade de agentes real**: conselho multi-voz, social media autônomo, especialistas de geração, triagem de WhatsApp, JARVIS com 14 tools de verdade executadas no cliente.
- **Grounding por cliente** (briefs) e disciplina de custo (pré-filtros, idempotência, Sonnet só onde vale).
- **Identidade visual** (amarelo ARK + dark/gold cliente) e o boot splash.
- **Pipeline de WhatsApp** com 3 transportes unificados, transcrição Whisper grátis e visão de imagem.

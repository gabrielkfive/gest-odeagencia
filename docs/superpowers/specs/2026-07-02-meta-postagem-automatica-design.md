# Meta: conectar Ads + publicar posts aprovados no Instagram/Facebook

Data: 2026-07-02

## Contexto

O WorkFlowArk já tem duas peças da integração com o Meta:

1. **Leitura de Ads** (deployado 2026-06-13): aba Integrações, Gabriel cola um token do Meta Business, o servidor guarda em `wfa-meta-secret` e as ações `meta-status`/`meta-relatorio` leem contas de anúncio e insights via Graph API v21. Esse token só tem escopo `ads_read`.
2. **Agente Social Media** (deployado 2026-06-29): rota `social-run` gera 2 propostas de post por cliente/dia (formato, gancho, roteiro, legenda, CTA, captação, melhor dia) e grava em `wfa-social-fila` com `status: "pendente"`. A UI em `/postagens` deixa aprovar/recusar/copiar legenda. As propostas são só texto — não têm imagem/vídeo anexado, e nada publica de fato.

O pedido agora é fechar esse loop: publicar de verdade no Instagram/Facebook quando uma proposta é aprovada.

## Decisão de abordagem

Publicar via **Graph API direto** (mesmo padrão já usado pro Ads), em vez de terceirizar pra Speedpost/Automa (cogitado antes na nota do agente social). Motivo: reaproveita a infra de token self-service que já existe, sem assinatura nova nem fragilidade de automação de navegador.

Escopo do token precisa crescer: além de `ads_read`, o Gabriel precisa gerar um token novo com `pages_show_list`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.

## Escopo do MVP

Publicação **manual com 1 clique** depois de aprovado — não é a IA publicando sozinha sem ninguém ver (mantém a regra "sem flood"/sem publicar sem revisão).

**Fora do escopo agora (fase 2, não construir ainda):**
- IA gerar a imagem/vídeo sozinha (hoje `captacao` só descreve o que filmar).
- Agendamento automático por cron respeitando `melhorDia`.
- Publicação de Stories (fluxo de API diferente).

## Design

### 1. Cadastro de contas por cliente (dentro de `/postagens`, não no monólito)

O token do Meta e o cadastro de contas de Ads continuam na aba Integrações do
`public/workflowark.html`, sem mudança. Mas o cadastro de **Page ID / Instagram
Business Account ID por cliente** (usado só pra publicar posts, não pra Ads) vai
num painel novo dentro da própria rota React `/postagens`, não no monólito — há
uma reforma visual grande (Apple→Linear) em andamento e não commitada em
`workflowark.html`; misturar uma feature nova nesse arquivo agora arriscaria
conflito com esse trabalho em paralelo, e a regra do projeto já pede feature
nova em rota React.

Painel "⚙️ Configurar contas" no topo de `/postagens` (colapsável), com um campo
de Page ID e um de Instagram Business Account ID por cliente do catálogo
(`vivenda`, `fercon`, `vaca`, `cachu`, `attra`, `brisa`, `fonseca`). Guardado no
servidor numa nova STATE_KEY `wfa-meta-contas` (formato `{ [clienteId]: { pageId, igId } }`),
no mesmo padrão server-only do `wfa-meta-secret` (nunca aparece de volta pro
cliente depois de salvo, só um "✓ conectado").

Novas actions em `workflowark.state.ts`:
- `set-meta-contas` — salva/atualiza o mapa de contas por cliente. Ao salvar, o servidor já chama `GET /me/accounts` com o token do Meta pra obter o **token de página** daquele Page ID e guarda junto (`pageAccessToken`, server-only) — assim a publicação no passo 3 não precisa trocar token na hora.
- `get-meta-contas-status` — devolve só quais clientes têm conta conectada (não devolve os IDs nem tokens), pra pintar os botões de publicar certos na UI.

### 2. Anexar mídia na proposta aprovada (`/postagens`)

Cada item de `wfa-social-fila` com `status: "aprovada"` ganha um campo de mídia: colar uma URL de imagem, ou escolher uma do banco de criativos (`wfa-criativos`) daquele cliente, se houver. Salvo no próprio item da fila (`item.midiaUrl`).

Sem mídia anexada, o botão "Publicar agora" fica desabilitado (não dá pra publicar um post do Instagram sem imagem/vídeo).

### 3. Publicar (nova action `social-publish` em `workflowark.state.ts`, ou rota dedicada `workflowark.social-publish.ts` se a lógica ficar grande)

Fluxo ao clicar "Publicar agora" num item aprovado com mídia:

1. Lê o item da fila (`wfa-social-fila`) e confere `status === "aprovada"` e `midiaUrl` preenchido.
2. Lê o token do Meta (`wfa-meta-secret`) e a conta do cliente (`wfa-meta-contas[clienteId]`).
3. **Instagram** (fluxo de 2 passos da API de publicação de conteúdo):
   - `POST /{ig-user-id}/media` com `image_url` + `caption` (legenda + CTA do item) → recebe `creation_id`.
   - `POST /{ig-user-id}/media_publish` com `creation_id` → recebe o `id` do post publicado.
4. **Facebook Page** (opcional, mesma ação): `POST /{page-id}/photos` com a imagem + legenda, usando o **token de página** (obtido via `/me/accounts` a partir do token de usuário — precisa trocar antes de publicar, ou já resolver isso ao salvar o token/contas).
5. Em caso de sucesso: atualiza o item da fila pra `status: "publicada"`, grava `postId`/link e a data de publicação. Em erro: mantém `status: "aprovada"` e devolve a mensagem de erro da Graph API pra UI mostrar (não trava a fila).

### 4. Segurança e guardrails do projeto

- Token e IDs de conta continuam só no servidor (nunca voltam pro client depois de salvos), mesmo padrão do `wfa-meta-secret`.
- Ação de publicar exige usuário autenticado (mesma auth das outras actions autenticadas de `/postagens`), não é pública como o link de aprovação do cliente.
- Tudo em rota React nova/existente (`/postagens` + `workflowark.state.ts`), sem tocar no monolito `public/workflowark.html` (regra do CLAUDE.md do projeto — há inclusive edição em andamento nesse arquivo por outra sessão).
- `npm run build` precisa passar antes de qualquer deploy; deploy = commit + push juntos (CI reconstrói do git).
- Fatias pequenas e testáveis: (1) cadastro de contas, (2) anexar mídia, (3) publicar — cada uma verificável isoladamente antes da próxima.

## Passo que só o Gabriel pode fazer

Gerar o token novo do Meta Business com os escopos de publicação (`pages_show_list`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`) e pegar o Page ID / Instagram Business Account ID de cada cliente que ele quiser publicar. Isso não dá pra automatizar — é ele que tem acesso ao Business Manager de cada cliente.

import { createFileRoute } from "@tanstack/react-router";
import { hojeSP } from "@/lib/datas";

const STATE_KEYS = new Set([
  "wfa-tarefas",
  "wfa-regua",
  "wfa-jornada",
  "wfa-demandas",
  "wfa-rotinas",
  "wfa-okrs",
  "wfa-okrs-edits",
  "wfa-inline-edits",
  "wfa-processos",
  "wfa-gcal",
  "wfa-fin",
  "wfa-crm",
  "wfa-agenda-events",
  "wfa-comercial",
  "wfa-cobranca",
  "wfa-acerto",
  "wfa-planilha",
  "wfa-planejamento",
  "wfa-notificacoes",
  "wfa-conselho-briefings",
  "wfa-drive",
  "wfa-brand",
  "wfa-widgets",
  "wfa-alpha",
  "wfa-alpha-am",
  "wfa-alpha-gt",
  "wfa-alpha-cr",
  "wfa-alpha-bs",
  // Banco de criativos que performaram: o cliente é dono e JÁ está em WFA_CLOUD_KEYS,
  // mas faltava aqui -> save-state devolvia 400 "Bloco inválido" e os criativos não
  // saíam de um aparelho pro outro (sumiam entre dispositivos). Mesmo caso do wfa-crm.
  "wfa-criativos",
  // Calendário editorial (rota /calendario): entradas planejadas por cliente/dia.
  "wfa-editorial",
  "wfa-warroom",
  "wfa-deleted-ids",
  // Config que o CLIENTE é dono e precisa sincronizar (faltavam aqui -> o save-state
  // devolvia 400 "Bloco inválido" e o sistema mostrava "Erro ao sincronizar", além de
  // os colaboradores/clientes custom não passarem de um aparelho pro outro).
  "wfa-clientes-custom",
  "wfa-colab-custom",
  "wfa-cliente-detalhes",
  // Extratos bancários importados na rota /inteligencia (lançamentos conciliáveis;
  // preparado para futura integração com o Nibo).
  "wfa-extratos",
  // Produção Audiovisual: captações com checklist do produtor e vídeos que viram
  // tarefas de edição automaticamente (evento "captação concluída").
  "wfa-producao",
  // Motor de Conteúdo: roteiros gerados pelo planejamento mensal (escrito pelo servidor,
  // lido pela rota /motor). Piloto com Vivenda; expansível por clienteId depois.
  "wfa-motor-plano",
  // Briefings estruturados que disparam a cadeia de pauta (roteiro → design → edição).
  "wfa-briefings",
  // Briefing de ENTRADA de cliente novo (identidade visual e site), preenchido na
  // página /briefing. Nome parecido com o de cima, papel diferente: aquele é pauta de
  // conteúdo, este é a reunião que abre o projeto. Só a página /briefing escreve aqui,
  // por isso não entra nas listas do workflowark.html.
  "wfa-briefing-cliente",
  // Solicitações de acerto a receber (ciclos e textos dos e-mails "SOLICITO ACERTO").
  "wfa-acertosrec",
  // Pins de mapa dos clientes (latitude/longitude salvo pelo comercial no mapa).
  "wfa-cli-geo",
  // Memória persistente do JARVIS (lida/apagada pelo painel 🧠 Memória na página JARVIS).
  "wfa-jarvis-memory",
  // Propostas geradas pelo Estrategista Comercial (propostas.html, iframe na aba Propostas).
  // Dados ficavam só em localStorage ark_props_v1; agora sincronizam entre dispositivos.
  "wfa-propostas",
  // NOTIFICACOES LIDAS (20/08/2026). Faltava aqui desde 27/07: o cliente tem wfa-notif-read
  // na lista de sync E tem codigo pra unir o que vem do servidor, mas a chave nao estava
  // liberada, entao TODO save era recusado com "Bloco invalido" e a fila do cliente
  // descartava em silencio. Resultado: marcar notificacao como lida nunca atravessava de
  // aparelho, que era exatamente o "99+ eterno" que aquela sessao tentou resolver.
  "wfa-notif-read",
  // OBS: wfa-whatsapp é de propósito SERVER-OWNED (escrito pelo webhook). O cliente só LÊ;
  // não entra aqui pra um save do cliente nunca sobrescrever mensagens que chegaram no servidor.
]);

const VALID_ROLES = new Set([
  "admin",
  "gestor",
  "financeiro",
  "operacao",
  "comercial",
  "marketing",
  "viewer",
]);

// Donos do sistema: sempre admin ativos, nunca podem ser bloqueados/removidos.
const OWNER_EMAILS = new Set(["gabrielkomercial@gmail.com"]);

type WorkflowMember = {
  id: string;
  email: string;
  full_name: string | null;
  user_id: string | null;
  role: string;
  active: boolean;
  permissions: Record<string, unknown>;
};

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

// BACKUP DIÁRIO: na 1ª carga do dia fotografa o estado inteiro (menos WhatsApp e os
// próprios backups) em wfa-backup-<data> e aposenta snapshots com mais de 14 dias.
// Pega carona no load via waitUntil, não atrasa resposta nenhuma. Se alguém zerar uma
// lista por engano, dá pra restaurar o dia anterior direto no Supabase.
async function backupDiarioSeDevido(db: any) {
  try {
    const hoje = hojeSP();
    const { data: last } = await db.from("workflowark_state").select("data").eq("key", "wfa-backup-last").maybeSingle();
    if ((last?.data as any)?.date === hoje) return;
    await db.from("workflowark_state").upsert({ key: "wfa-backup-last", data: { date: hoje } });
    const { data: rows } = await db
      .from("workflowark_state").select("key,data")
      .neq("key", "wfa-whatsapp").not("key", "like", "wfa-backup-%");
    const snap = Object.fromEntries((rows ?? []).map((r: any) => [r.key, r.data]));
    await db.from("workflowark_state").upsert({ key: `wfa-backup-${hoje}`, data: snap });
    const lim = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const { data: olds } = await db.from("workflowark_state").select("key").like("key", "wfa-backup-2%");
    for (const r of olds ?? []) {
      const d = String(r.key).slice("wfa-backup-".length);
      if (d && d < lim) await db.from("workflowark_state").delete().eq("key", r.key);
    }
  } catch { /* backup nunca derruba o load */ }
}

function readBearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function isStateKey(key: string) {
  return STATE_KEYS.has(key) || key.startsWith("wfa-ckl-");
}

// TOKEN DE LINK PUBLICO (portal do cliente e aprovacao de conteudo).
// Estes links sao o unico segredo: quem tem a URL ve os dados daquele cliente, sem login,
// e no caso do portal o token e PERSISTENTE, reusado pra sempre.
// Antes havia um fallback silencioso pra Date.now() + Math.random(), que e previsivel:
// se ele disparasse uma vez, aquele cliente ficava com um link adivinhavel permanente.
// Agora sao dois geradores CRIPTOGRAFICOS e, se nenhum existir, falha. Nao gerar o link
// e muito melhor do que gerar um que da pra adivinhar.
function novoTokenPublico(): string | null {
  const c = globalThis.crypto as Crypto | undefined;
  const uuid = c?.randomUUID?.();
  if (uuid) return uuid.replace(/[^a-zA-Z0-9]/g, "");
  if (c?.getRandomValues) {
    const b = new Uint8Array(24);
    c.getRandomValues(b);
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  }
  return null;
}

async function getContext(request: Request) {
  // ACESSO DE SERVIÇO (automações do Claude na nuvem / cron): header "x-run-key" com o
  // segredo RUN_KEY dá o contexto do DONO (admin), sem sessão de navegador. Não usamos
  // ?key= da query porque no GET ele já significa "qual bloco de estado carregar".
  // Escreve como o Gabriel (updated_by = user_id real do dono, preserva FK/auditoria).
  const svcKey = request.headers.get("x-run-key") || "";
  if (svcKey) {
    const { runSecret } = await import("@/integrations/run-auth.server");
    const secret = await runSecret();
    if (!secret || svcKey !== secret) {
      return { error: json({ error: "Não autenticado" }, { status: 401 }) };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const ownerEmail = [...OWNER_EMAILS][0];
    const { data: owner } = await db
      .from("workflowark_members")
      .select("*")
      .eq("email", ownerEmail)
      .maybeSingle();
    if (!owner?.active) {
      return { error: json({ error: "Conta de serviço indisponível." }, { status: 500 }) };
    }
    return { db, user: { id: owner.user_id }, member: owner as WorkflowMember, isAdmin: true };
  }

  const token = readBearer(request);
  if (!token) return { error: json({ error: "Não autenticado" }, { status: 401 }) };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data, error } = await db.auth.getUser(token);
  const user = data?.user;
  const email = String(user?.email ?? "").toLowerCase();

  if (error || !user || !email) {
    return { error: json({ error: "Sessão inválida" }, { status: 401 }) };
  }

  const { count } = await db
    .from("workflowark_members")
    .select("id", { count: "exact", head: true });

  let { data: member } = await db
    .from("workflowark_members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    const byEmail = await db
      .from("workflowark_members")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    member = byEmail.data;
    if (member && !member.user_id) {
      const updated = await db
        .from("workflowark_members")
        .update({ user_id: user.id })
        .eq("id", member.id)
        .select("*")
        .single();
      member = updated.data ?? member;
    }
  }

  // Proteção de dono: garante sempre admin ativo (nunca trava o fundador para fora).
  if (OWNER_EMAILS.has(email)) {
    if (member) {
      if (!member.active || member.role !== "admin" || !member.user_id) {
        const fixed = await db
          .from("workflowark_members")
          .update({ active: true, role: "admin", user_id: user.id })
          .eq("id", member.id)
          .select("*")
          .single();
        member = fixed.data ?? { ...member, active: true, role: "admin" };
      }
    } else {
      const up = await db
        .from("workflowark_members")
        .upsert(
          {
            email,
            user_id: user.id,
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Gabriel Andrade",
            role: "admin",
            active: true,
            created_by: user.id,
          },
          { onConflict: "email" },
        )
        .select("*")
        .single();
      member = up.data;
    }
  }

  if (!member && (count ?? 0) === 0) {
    const created = await db
      .from("workflowark_members")
      .insert({
        email,
        user_id: user.id,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        role: "admin",
        active: true,
        created_by: user.id,
      })
      .select("*")
      .single();
    member = created.data;
  }

  // Usuário autenticado sem cadastro: registra como pendente (inativo) para o gestor liberar.
  if (!member) {
    const created = await db
      .from("workflowark_members")
      .insert({
        email,
        user_id: user.id,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        role: "viewer",
        active: false,
        created_by: user.id,
      })
      .select("*")
      .single();
    member = created.data;
  }

  if (!member || !member.active) {
    return {
      error: json(
        { error: "Sua conta foi criada e está aguardando liberação do gestor.", pending: true },
        { status: 403 },
      ),
    };
  }

  return { db, user, member: member as WorkflowMember, isAdmin: member.role === "admin" };
}

export const Route = createFileRoute("/api/workflowark/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getContext(request);
        if ("error" in ctx) return ctx.error;

        // Piloto automático do planejamento mensal: pega carona no load (waitUntil =
        // segundo plano, não atrasa a resposta). Idempotente — no-op no resto do mês.
        try {
          const cw: any = await import("cloudflare:workers");
          if (typeof cw?.waitUntil === "function") {
            const { planMensalSeDevido } = await import("@/integrations/plan-mensal.server");
            cw.waitUntil(planMensalSeDevido(ctx.db));
            cw.waitUntil(backupDiarioSeDevido(ctx.db));
          }
        } catch { /* dev local: sem cloudflare:workers, sem piloto automático */ }

        // NUNCA devolve segredos/tokens ao cliente (Meta token, Google OAuth refresh token…)
        const isSensitive = (k: string) => /-(secret|oauth)$/.test(k) || k === "wfa-portal-tokens" || k.startsWith("wfa-backup-");
        // BOOT LEVE: wfa-whatsapp (todas as conversas) é de longe o maior payload do estado
        // e não é necessário pra pintar a primeira tela. Fica fora do load inicial e o app
        // busca sob demanda com ?key=wfa-whatsapp (abaixo).
        const isHeavy = (k: string) => k === "wfa-whatsapp";

        const u = new URL(request.url);
        const soKey = String(u.searchParams.get("key") || "");
        if (soKey) {
          if (isSensitive(soKey)) return json({ error: "chave reservada" }, { status: 403 });
          const { data: row, error: e1 } = await ctx.db
            .from("workflowark_state")
            .select("key,data")
            .eq("key", soKey)
            .maybeSingle();
          if (e1) return json({ error: "Não foi possível carregar os dados." }, { status: 500 });
          return json({ state: { [soKey]: row?.data ?? null } });
        }

        // Exclui o wfa-whatsapp JÁ NA CONSULTA: o blob (1,6MB+) era baixado e parseado
        // em TODA sincronização só para ser descartado pelo filtro isHeavy abaixo.
        // Com várias abas sincronizando ao mesmo tempo isso estourava a memória do
        // Worker (Error 1102 "exceeded resource limits" intermitente no load).
        //
        // SYNC CONDICIONAL (?since=): o app manda o updated_at máximo que já aplicou.
        // Só voltam as linhas que mudaram depois disso — na imensa maioria dos ticks de
        // 6s NADA mudou e a resposta é {unchanged:true}, sem serializar o estado inteiro.
        // O trigger workflowark_state_updated_at (BEFORE UPDATE) garante o carimbo em
        // qualquer escrita, de qualquer escritor.
        const since = String(u.searchParams.get("since") || "");
        let q = ctx.db
          .from("workflowark_state")
          .select("key,data,updated_at")
          .neq("key", "wfa-whatsapp")
          .not("key", "like", "wfa-backup-%"); // snapshots diários nunca descem pro cliente
        if (since) q = q.gt("updated_at", since);
        const { data: rows, error } = await q;
        if (error) return json({ error: "Não foi possível carregar os dados." }, { status: 500 });

        let maxT = since;
        for (const row of rows ?? []) {
          if (row.updated_at && (!maxT || String(row.updated_at) > maxT)) maxT = String(row.updated_at);
        }
        if (since && !(rows ?? []).length) {
          return json({ unchanged: true, t: since, member: ctx.member });
        }

        const state = Object.fromEntries((rows ?? []).filter((row: any) => !isSensitive(row.key) && !isHeavy(row.key)).map((row: any) => {
          // wfa-gcal: cada membro vê apenas sua própria entrada de agenda (não a de todos)
          if (row.key === "wfa-gcal") {
            const memberId = ctx.member.id;
            return [row.key, { [memberId]: (row.data as any)?.[memberId] ?? null }];
          }
          return [row.key, row.data];
        }));
        let members: WorkflowMember[] = [];
        if (ctx.isAdmin) {
          const result = await ctx.db
            .from("workflowark_members")
            .select("id,email,full_name,user_id,role,active,permissions")
            .order("created_at", { ascending: true });
          members = result.data ?? [];
        }

        return json({ state, member: ctx.member, members, t: maxT || null });
      },

      POST: async ({ request }) => {
        const ctx = await getContext(request);
        if ("error" in ctx) return ctx.error;

        const body = await request.json().catch(() => ({}));
        const action = String(body.action ?? "save-state");

        if (action === "save-state") {
          const key = String(body.key ?? "");
          if (!isStateKey(key)) return json({ error: "Bloco inválido" }, { status: 400 });
          let data = body.data ?? null;
          // LÁPIDE É MONOTÔNICA: wfa-deleted-ids só cresce. UNIÃO com o que já está no
          // servidor em vez de substituir — um aparelho desatualizado não pode apagar a
          // lápide do colega (era assim que item excluído "ressuscitava" pra todo mundo).
          if (key === "wfa-deleted-ids" && Array.isArray(data)) {
            const { data: row } = await ctx.db
              .from("workflowark_state").select("data").eq("key", key).maybeSingle();
            const atual: unknown[] = Array.isArray(row?.data) ? row.data : [];
            data = [...new Set([...atual, ...data])].slice(-3000);
          }
          // wfa-notif-read tambem e monotonica: "li esta notificacao" nunca desli. Uniao
          // pelo mesmo motivo da lapide, senao o celular sobrescreveria o que foi lido no
          // PC e o sino voltaria a encher. Corte em 2000 igual ao do cliente.
          if (key === "wfa-notif-read" && Array.isArray(data)) {
            const { data: row } = await ctx.db
              .from("workflowark_state").select("data").eq("key", key).maybeSingle();
            const atual: unknown[] = Array.isArray(row?.data) ? row.data : [];
            data = [...new Set([...atual, ...data])].slice(-2000);
          }
          const { error } = await ctx.db.from("workflowark_state").upsert({
            key,
            data,
            updated_by: ctx.user.id,
          });
          if (error) return json({ error: "Não foi possível salvar." }, { status: 500 });
          return json({ ok: true });
        }

        if (action === "save-many") {
          const entries = body.entries && typeof body.entries === "object" ? body.entries : {};
          const rows = Object.entries(entries)
            .filter(([key]) => isStateKey(key))
            .map(([key, data]) => ({ key, data, updated_by: ctx.user.id }));
          if (rows.length) {
            const { error } = await ctx.db.from("workflowark_state").upsert(rows);
            if (error) return json({ error: "Não foi possível sincronizar." }, { status: 500 });
          }
          return json({ ok: true, saved: rows.length });
        }

        if (action === "load-key") {
          const key = String(body.key ?? "");
          if (!isStateKey(key)) return json({ error: "Bloco inválido" }, { status: 400 });
          const { data, error } = await ctx.db.from("workflowark_state").select("data").eq("key", key).maybeSingle();
          if (error) return json({ error: "Não foi possível carregar." }, { status: 500 });
          return json(data?.data ?? null);
        }

        // AGENTE SOCIAL MEDIA: aprovar/recusar uma proposta da fila (wfa-social-fila).
        // A fila é SERVER-OWNED (escrita pelo agente social-run); aqui o gestor só muda o
        // STATUS de UM item — nunca sobrescreve a fila inteira (evita perder propostas).
        if (action === "social-decide") {
          const id = String(body.id ?? "");
          const decisao = String(body.decisao ?? "");
          if (!id || !["aprovada", "recusada", "pendente", "agendada"].includes(decisao)) {
            return json({ error: "Parâmetros inválidos." }, { status: 400 });
          }
          const { data: row, error: rErr } = await ctx.db
            .from("workflowark_state").select("data").eq("key", "wfa-social-fila").maybeSingle();
          if (rErr) return json({ error: "Não foi possível ler a fila." }, { status: 500 });
          const fila: any[] = Array.isArray(row?.data) ? row.data.slice() : [];
          const idx = fila.findIndex((p: any) => p?.id === id);
          if (idx < 0) return json({ error: "Proposta não encontrada." }, { status: 404 });
          fila[idx] = { ...fila[idx], status: decisao, decididoPor: ctx.member.email, decididoEm: new Date().toISOString() };
          const { error } = await ctx.db
            .from("workflowark_state").upsert({ key: "wfa-social-fila", data: fila, updated_by: ctx.user.id });
          if (error) return json({ error: "Não foi possível salvar a decisão." }, { status: 500 });
          return json({ ok: true });
        }

        // Gera um link público de aprovação de conteúdo (só a agência logada cria).
        // Guarda um snapshot do plano sob wfa-approval-<token> (fora do estado sincronizado
        // do cliente). O cliente abre /aprovar?t=<token> e decide sem login.
        if (action === "create-approval") {
          const cliente = String(body.cliente ?? "").trim();
          const ideias = Array.isArray(body.ideias) ? body.ideias : [];
          if (!ideias.length) return json({ error: "Não há ideias para aprovar." }, { status: 400 });
          const token = novoTokenPublico();
          if (!token) return json({ error: "Não foi possível gerar o link com segurança." }, { status: 500 });
          const data = {
            cliente,
            periodo: String(body.periodo ?? ""),
            ideias,
            status: "pending",
            items: {},
            feedback: "",
            agency: "ARK Content",
            createdAt: new Date().toISOString(),
          };
          const { error } = await ctx.db
            .from("workflowark_state")
            .upsert({ key: `wfa-approval-${token}`, data, updated_by: ctx.user.id });
          if (error) return json({ error: "Não foi possível gerar o link." }, { status: 500 });
          return json({ ok: true, token });
        }

        // Portal do cliente: gera link PERSISTENTE e idempotente por cliente.
        // Um clienteId sempre resulta no mesmo token — reusar evita tokens órfãos.
        if (action === "create-portal") {
          const cliente = String(body.cliente ?? "").trim();
          const planKey = String(body.planKey ?? "").trim();
          if (!cliente) return json({ error: "Diga o cliente." }, { status: 400 });
          const clienteId = String(body.planKey ?? cliente).toLowerCase().replace(/[^a-z0-9]/g, "");

          // Índice de tokens por clienteId (chave fixa no Supabase)
          const tokensRaw = await (async () => {
            const { data } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-portal-tokens").maybeSingle();
            return data?.data ?? {};
          })();
          const tokens: Record<string, string> = typeof tokensRaw === "object" && tokensRaw ? tokensRaw : {};

          let token = tokens[clienteId];
          if (!token) {
            const novo = novoTokenPublico();
            if (!novo) return json({ error: "Não foi possível gerar o portal com segurança." }, { status: 500 });
            token = novo;
            tokens[clienteId] = token;
            const { error: idxErr } = await ctx.db.from("workflowark_state")
              .upsert({ key: "wfa-portal-tokens", data: tokens, updated_by: ctx.user.id });
            if (idxErr) return json({ error: "Não foi possível gerar o portal." }, { status: 500 });
          }

          const portalData = { cliente, planKey, agency: "ARK Content", createdAt: new Date().toISOString() };
          const { error } = await ctx.db.from("workflowark_state")
            .upsert({ key: `wfa-portal-${token}`, data: portalData, updated_by: ctx.user.id });
          if (error) return json({ error: "Não foi possível gerar o portal." }, { status: 500 });
          return json({ ok: true, token });
        }

        if (action === "add-member") {
          if (!ctx.isAdmin) return json({ error: "Apenas admin pode alterar acessos." }, { status: 403 });
          const email = String(body.email ?? "").trim().toLowerCase();
          const role = VALID_ROLES.has(String(body.role)) ? String(body.role) : "viewer";
          if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "E-mail inválido" }, { status: 400 });
          const { error } = await ctx.db.from("workflowark_members").upsert({
            email,
            full_name: String(body.full_name ?? "").trim() || null,
            role,
            active: body.active !== false,
            created_by: ctx.user.id,
          }, { onConflict: "email" });
          if (error) return json({ error: "Não foi possível salvar o acesso." }, { status: 500 });
          return json({ ok: true });
        }

        if (action === "update-member") {
          if (!ctx.isAdmin) return json({ error: "Apenas admin pode alterar acessos." }, { status: 403 });
          const id = String(body.id ?? "");
          const patch: Record<string, unknown> = {};
          // Não deixa o admin rebaixar/desativar a si mesmo (evita se trancar pra fora sozinho).
          if (VALID_ROLES.has(String(body.role)) && body.id !== ctx.member.id) patch.role = String(body.role);
          if (typeof body.active === "boolean") patch.active = body.id === ctx.member.id ? true : body.active;
          if (typeof body.full_name === "string") patch.full_name = body.full_name.trim() || null;
          if (body.permissions && typeof body.permissions === "object") patch.permissions = body.permissions;
          const { error } = await ctx.db.from("workflowark_members").update(patch).eq("id", id);
          if (error) return json({ error: "Não foi possível atualizar o acesso." }, { status: 500 });
          return json({ ok: true });
        }

        if (action === "remove-member") {
          if (!ctx.isAdmin) return json({ error: "Apenas admin pode remover acessos." }, { status: 403 });
          const id = String(body.id ?? "");
          if (id === ctx.member.id) return json({ error: "Você não pode remover a si mesmo." }, { status: 400 });
          const { data: m } = await ctx.db
            .from("workflowark_members")
            .select("user_id,email")
            .eq("id", id)
            .maybeSingle();
          // Nunca remover o dono: apagar a conta de auth dele o tranca pra fora de vez
          // (o auto-conserto do getContext não roda porque ele nem consegue mais logar).
          if (m?.email && OWNER_EMAILS.has(String(m.email).toLowerCase())) {
            return json({ error: "O dono da conta não pode ser removido." }, { status: 403 });
          }
          const { error } = await ctx.db.from("workflowark_members").delete().eq("id", id);
          if (error) return json({ error: "Não foi possível remover o membro." }, { status: 500 });
          if (m?.user_id) {
            try { await ctx.db.auth.admin.deleteUser(m.user_id); } catch { /* ignore */ }
          }
          return json({ ok: true });
        }

        if (action === "upload-file") {
          const filename = String(body.filename ?? "arquivo").replace(/[^\w.\-]+/g, "_").slice(0, 90);
          const contentType = String(body.contentType ?? "application/octet-stream");
          const b64 = String(body.dataBase64 ?? "");
          if (!b64) return json({ error: "Nenhum arquivo recebido." }, { status: 400 });
          try {
            const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            const bucket = "arquivos";
            await (ctx.db as any).storage.createBucket(bucket, { public: true }).catch(() => {});
            const path = `${Date.now()}-${filename}`;
            const { error } = await (ctx.db as any).storage.from(bucket).upload(path, bin, { contentType, upsert: true });
            if (error) return json({ error: error.message || "Falha no upload" }, { status: 500 });
            const { data: pub } = (ctx.db as any).storage.from(bucket).getPublicUrl(path);
            return json({ ok: true, url: pub?.publicUrl, filename });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha no upload" }, { status: 500 });
          }
        }

        if (action === "agente-roteirista") {
          const tema = String(body.tema ?? body.prompt ?? "").trim();
          if (!tema) return json({ error: "Diga o tema/assunto do vídeo." }, { status: 400 });
          const cliente = String(body.cliente ?? "").trim();
          const plataforma = String(body.plataforma ?? "Instagram Reels").trim();
          const qtd = Math.min(Math.max(parseInt(String(body.qtd ?? "3"), 10) || 3, 1), 8);
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const key = zapiEnv("ANTHROPIC_API_KEY");
          if (!key) return json({ error: "IA não configurada." }, { status: 500 });
          const sys = [
            "Você é um ROTEIRISTA VIRAL sênior da ARK Content (agência de marketing gastronômico/varejo em Brasília). NÃO escreve como IA robótica — escreve como gente que entende de algoritmo e de scroll. Cria roteiros de vídeo curto que param o scroll, retêm e convertem (cliente entrando na loja / chamando no WhatsApp).",
            "REGRAS DE OURO:",
            "- GANCHO: máx 2 linhas (lido em ~3s). NUNCA comece com 'Olá pessoal', 'Hoje eu vou te mostrar', 'Nesse vídeo'. Primeiro frame é conflito, pergunta ou afirmação chocante. Padrões que funcionam: 'X pessoas fazem Y errado', 'Ninguém te conta que Z', 'Parei de X e aconteceu Y'.",
            "- Cada bloco com micro-gancho (a pessoa decide a cada 3s se fica). Frases curtas, uma ideia por frase, linguagem do cotidiano ('melhorar' não 'otimizar').",
            "- Entregue valor real (no mínimo 3 pontos) ANTES do CTA. CTA ÚNICO e integrado à última entrega (nunca solto tipo 'me segue').",
            "- Indique (Texto na tela: \"...\"), [CORTE], (mostra ...). Instagram Reels: o espectador decide em ~7s, ritmo rápido.",
            "Para CADA roteiro entregue NESTE formato (não mostre raciocínio):",
            "TÍTULO: ...",
            "GANCHO: ...",
            "BLOCO 1 — [nome]: ... (Visual: ...)",
            "BLOCO 2 — [nome]: ...",
            "CTA: ...",
            "LEGENDA: ... (+ 3 hashtags)",
            "POR QUE FUNCIONA: ...",
            "Separe cada roteiro com uma linha '———'. Não faça perguntas — assuma os melhores defaults e entregue pronto pra gravar.",
          ].join("\n");
          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief(cliente);
          const sysFull = brief
            ? sys + "\n\nCONTEXTO REAL DO CLIENTE (use de verdade — pessoas, produtos, tom e plano; NADA genérico):\n" + brief
            : sys;
          const referencia = String(body.referencia ?? "").trim().slice(0, 40000);
          const refBlock = referencia
            ? `\n\nHISTÓRICO/REFERÊNCIAS COLADAS PELO GESTOR (use como padrão de tom, estrutura e regras — NÃO copie literal, mas mantenha a mesma pegada):\n${referencia}`
            : "";
          const user = `Cliente: ${cliente || "(varejo gastronômico genérico)"} · Plataforma: ${plataforma} · Tema/assunto: ${tema}\nGere ${qtd} roteiro(s) de vídeo curto, prontos pra gravar.${refBlock}`;
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 3000, system: sysFull, messages: [{ role: "user", content: user }] }),
            });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            return json({ text: data?.content?.[0]?.text || "(sem resposta)" });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao gerar roteiros." }, { status: 502 });
          }
        }

        if (action === "agente-planejamento") {
          const cliente = String(body.cliente ?? "").trim();
          const periodo = String(body.periodo ?? "este mês").trim();
          const foco = String(body.foco ?? "").trim();
          const qtd = Math.min(Math.max(parseInt(String(body.qtd ?? "8"), 10) || 8, 3), 16);
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const key = zapiEnv("ANTHROPIC_API_KEY");
          if (!key) return json({ error: "IA não configurada." }, { status: 500 });
          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief(cliente);
          const sys = [
            "Você é o PLANEJADOR DE CONTEÚDO sênior da ARK Content (agência de marketing em Brasília). Monta o calendário de conteúdo de redes sociais (Instagram/TikTok) de um cliente — pensando como dono de agência: realista, vendedor, conectado ao momento do cliente. NÃO genérico.",
            "Cada ideia deve ter um ÂNGULO/gancho específico (não 'poste sobre o produto X', e sim a abordagem que para o scroll). Varie formatos (Reels, Carrossel, Story, Foto). Conecte com datas/contexto quando fizer sentido.",
            "Distribua as ideias em DATAS CONCRETAS dentro do período (campo data em YYYY-MM-DD). Use o ano corrente se não for dito. Evite domingos para posts pesados, espalhe ao longo das semanas. Se uma ideia não tiver dia específico, deixe data:''.",
            "Responda SOMENTE com um JSON válido (nada fora dele): um objeto {\"ideias\":[...]}. Cada ideia: {\"data\":\"YYYY-MM-DD ou ''\",\"dia\":\"rótulo curto ex: Seg 16/06\",\"formato\":\"Reels|Carrossel|Story|Foto\",\"tema\":\"título curto e específico\",\"produto\":\"produto/serviço foco ou ''\",\"angulo\":\"o gancho/abordagem em 1 frase\",\"legenda\":\"primeira linha da legenda, no tom da marca\"}.",
            brief ? "CONTEXTO REAL DO CLIENTE (use de verdade — pessoas, produtos, tom, plano):\n" + brief : "",
          ].filter(Boolean).join("\n");
          const hoje = hojeSP();
          const user = `Hoje é ${hoje}. Cliente: ${cliente || "(varejo genérico)"} · Período: ${periodo}${foco ? " · Foco especial: " + foco : ""}\nMonte ${qtd} ideias de conteúdo para o período, com datas concretas, em JSON.`;
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 3000, system: sys, messages: [{ role: "user", content: user }] }),
            });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            let raw: string = data?.content?.[0]?.text || "";
            raw = raw.replace(/```json|```/g, "").trim();
            const m = raw.match(/\{[\s\S]*\}/);
            let ideias: any[] = [];
            if (m) { try { ideias = JSON.parse(m[0])?.ideias || []; } catch { ideias = []; } }
            if (!Array.isArray(ideias)) ideias = [];
            return json({ ideias, text: raw });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao montar o planejamento." }, { status: 502 });
          }
        }

        if (action === "agente-legenda") {
          const tema = String(body.tema ?? "").trim();
          if (!tema) return json({ error: "Diga o tema/assunto (ou cole o roteiro)." }, { status: 400 });
          const cliente = String(body.cliente ?? "").trim();
          const rede = String(body.rede ?? "Instagram").trim();
          const objetivo = String(body.objetivo ?? "").trim();
          const qtd = Math.min(Math.max(parseInt(String(body.qtd ?? "2"), 10) || 2, 1), 4);
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const key = zapiEnv("ANTHROPIC_API_KEY");
          if (!key) return json({ error: "IA não configurada." }, { status: 500 });
          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief(cliente);
          const sys = [
            "Você é COPYWRITER e SOCIAL MEDIA sênior da ARK Content (Brasília). Escreve legendas de Instagram/TikTok que param o scroll, retêm e convertem — NO TOM DA MARCA, como gente de verdade (nunca robótico, nunca clichê de IA).",
            "REGRAS: A 1ª linha é um GANCHO (a legenda também precisa parar o scroll — nada de 'Você sabia que...'). Corpo curto, quebrado em linhas com respiro, linguagem do cotidiano. UM CTA claro e específico. No fim, 4 a 6 hashtags relevantes (mistura nicho + local de Brasília).",
            "Para CADA legenda, entregue NESTE formato (sem explicar o raciocínio):",
            "GANCHO: ...",
            "CORPO: ... (2-5 linhas curtas)",
            "CTA: ...",
            "HASHTAGS: #... #...",
            "Separe cada variação com uma linha '———'. Assuma os melhores defaults e entregue pronto pra postar.",
            brief ? "CONTEXTO REAL DO CLIENTE (use de verdade — pessoas, produtos, tom, plano):\n" + brief : "",
          ].filter(Boolean).join("\n");
          const user = `Cliente: ${cliente || "(varejo genérico)"} · Rede: ${rede}${objetivo ? " · Objetivo: " + objetivo : ""}\nTema/roteiro:\n"""${tema}"""\nEscreva ${qtd} variação(ões) de legenda.`;
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1800, system: sys, messages: [{ role: "user", content: user }] }),
            });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            return json({ text: data?.content?.[0]?.text || "(sem resposta)" });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao gerar legendas." }, { status: 502 });
          }
        }

        if (action === "agente-vivenda") {
          const prompt = String(body.prompt ?? "").trim();
          if (!prompt) return json({ error: "Escreva o que você quer pedir ao agente." }, { status: 400 });
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const key = zapiEnv("ANTHROPIC_API_KEY");
          if (!key) return json({ error: "IA não configurada (sem ANTHROPIC_API_KEY)." }, { status: 500 });
          // contexto vivo: puxa dados da Vivenda já salvos no sistema (plano de Junho, etc.)
          let contexto = "";
          try {
            const { data: rows } = await ctx.db.from("workflowark_state").select("key,data").in("key", ["wfa-inline-edits", "wfa-tarefas"]);
            const inline = (rows || []).find((r: any) => r.key === "wfa-inline-edits")?.data || {};
            const viv = Object.fromEntries(Object.entries(inline).filter(([k]) => String(k).startsWith("viv_")));
            const tarefas = ((rows || []).find((r: any) => r.key === "wfa-tarefas")?.data || []) as any[];
            const tViv = tarefas.filter((t) => /viv/i.test(t?.clienteId || "") || /vivenda/i.test(t?.title || "")).slice(0, 15).map((t) => `- ${t.title} (${t.resp || "?"}, ${t.data || "?"})`).join("\n");
            contexto = `\n\nDADOS ATUAIS DA VIVENDA NO SISTEMA:\nCampos do plano (preenchidos): ${JSON.stringify(viv)}\nTarefas da Vivenda:\n${tViv || "(nenhuma)"}`;
          } catch { /* segue sem contexto extra */ }
          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief("vivenda");
          const sys = `Você é o ESTRATEGISTA da ARK Content dedicado à FARMÁCIA VIVENDA — o cliente prioritário (empresa da família do dono, Plano X). NÃO invente dados nem campanhas genéricas/inviáveis: seja específico, realista e aplicável. Pense como dono de agência brasileiro: direto, prático, com foco em vender (gente entrando na farmácia / WhatsApp), respeitando o orçamento. Quando faltar informação real (resultados de tráfego, nº de produções, histórico), DIGA o que você precisa em vez de chutar. Entregue em tópicos curtos e acionáveis.\n\nCONTEXTO REAL DO CLIENTE (use sempre — pessoas/decisores, posicionamento, produtos, plano):\n${brief}${contexto}`;
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1600, system: sys, messages: [{ role: "user", content: prompt }] }),
            });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            return json({ text: data?.content?.[0]?.text || "(sem resposta)" });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao consultar o agente." }, { status: 502 });
          }
        }

        if (action === "send-whatsapp") {
          const phone = String(body.phone ?? "").replace(/\D/g, "");
          const jid = String(body.jid ?? "");
          const message = String(body.message ?? "").trim();
          if (!phone || !message) return json({ error: "Telefone e mensagem são obrigatórios." }, { status: 400 });
          const isGroup = jid.includes("@g.us");
          // Sempre envia pro JID completo quando temos (cobre @lid/privacidade, @s.whatsapp.net e grupos);
          // só cai pros dígitos se não houver jid. Enviar pros dígitos de um @lid falha (não é telefone).
          const target = jid ? jid : phone;
          try {
            const { waSendText, appendWhatsapp } = await import("@/integrations/zapi.server");
            await waSendText(target, message);
            await appendWhatsapp(ctx.db as any, { phone, dir: "out", text: message, isGroup, jid });
            return json({ ok: true });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao enviar pelo WhatsApp." }, { status: 502 });
          }
        }

        // Preenche nome + foto dos GRUPOS de uma vez (corrige conversas com nome do remetente).
        if (action === "wa-sync-groups") {
          try {
            const { evoAllGroups } = await import("@/integrations/zapi.server");
            const groups = await evoAllGroups();
            const byJid: Record<string, { subject: string; pic: string }> = {};
            const byDigits: Record<string, { subject: string; pic: string }> = {};
            groups.forEach((g) => {
              if (g.jid) byJid[g.jid] = { subject: g.subject, pic: g.pic };
              const d = g.jid.replace(/\D/g, "");
              if (d) byDigits[d] = { subject: g.subject, pic: g.pic };
            });
            const { data: row } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-whatsapp").maybeSingle();
            const st: any = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : { conversas: {} };
            if (!st.conversas) st.conversas = {};
            let n = 0;
            Object.entries(st.conversas).forEach(([pk, c]: [string, any]) => {
              const j = c.jid || "";
              const d = String(c.phone || pk).replace(/\D/g, "");
              const g = byJid[j] || byDigits[d];
              if (g) {
                c.isGroup = true;
                if (g.subject) { c.nome = g.subject; c.subjFetched = true; }
                if (g.pic) c.avatar = g.pic;
                n++;
              }
            });
            await ctx.db.from("workflowark_state").upsert({ key: "wfa-whatsapp", data: st });
            return json({ ok: true, updated: n, groups: groups.length });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao sincronizar grupos" }, { status: 502 });
          }
        }

        // Preenche a foto de perfil dos contatos DIRETOS que ainda não têm (conversas
        // antigas, criadas antes do webhook buscar avatar). Limita por chamada pra não
        // estourar timeout; marca avatarTried pra não re-tentar quem não tem foto.
        if (action === "wa-sync-avatars") {
          try {
            const { evoFetchAvatar } = await import("@/integrations/zapi.server");
            const { data: row } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-whatsapp").maybeSingle();
            const st: any = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : { conversas: {} };
            if (!st.conversas) st.conversas = {};
            const pendentes = Object.entries(st.conversas)
              .filter(([, c]: [string, any]) => !c.isGroup && !c.avatar && !c.avatarTried)
              .sort((a: any, b: any) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
              .slice(0, 25);
            let n = 0;
            for (const [pk, c] of pendentes as [string, any][]) {
              const alvo = c.jid || String(c.phone || pk);
              const a = await evoFetchAvatar(alvo).catch(() => "");
              c.avatarTried = true;
              if (a) { c.avatar = a; n++; }
            }
            await ctx.db.from("workflowark_state").upsert({ key: "wfa-whatsapp", data: st });
            const restam = Object.values(st.conversas).filter((c: any) => !c.isGroup && !c.avatar && !c.avatarTried).length;
            return json({ ok: true, updated: n, restam });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao sincronizar fotos" }, { status: 502 });
          }
        }

        // Envia mídia (imagem/vídeo/áudio/documento) a partir de base64.
        if (action === "send-whatsapp-media") {
          const phone = String(body.phone ?? "").replace(/\D/g, "");
          const jid = String(body.jid ?? "");
          const base64 = String(body.base64 ?? "");
          const mimetype = String(body.mimetype ?? "application/octet-stream");
          const fileName = String(body.fileName ?? "arquivo");
          const caption = String(body.caption ?? "");
          if (!phone || !base64) return json({ error: "Destino e arquivo são obrigatórios." }, { status: 400 });
          const target = jid ? jid : phone;
          const isGroup = jid.includes("@g.us");
          const mediatype = /^image\//.test(mimetype) ? "image" : /^video\//.test(mimetype) ? "video" : /^audio\//.test(mimetype) ? "audio" : "document";
          try {
            const { evoSendMedia, evoSendAudio, appendWhatsapp } = await import("@/integrations/zapi.server");
            if (mediatype === "audio") await evoSendAudio(target, base64);
            else await evoSendMedia(target, { base64, mimetype, fileName, mediatype, caption });
            await appendWhatsapp(ctx.db as any, { phone, dir: "out", text: caption || `📎 ${fileName}`, isGroup, jid });
            return json({ ok: true });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao enviar mídia." }, { status: 502 });
          }
        }

        // Baixa a mídia de uma mensagem (sob demanda) e devolve como data URL.
        if (action === "wa-media") {
          const id = String(body.id ?? "");
          const remoteJid = body.remoteJid ? String(body.remoteJid) : undefined;
          const fromMe = typeof body.fromMe === "boolean" ? body.fromMe : undefined;
          const filenameHint = body.filename ? String(body.filename) : undefined;
          if (!id) return json({ error: "id da mídia obrigatório" }, { status: 400 });
          try {
            const { bridgeConfigured, bridgeDownload, bridgeMediaBase64 } = await import("@/integrations/zapi.server");
            if (bridgeConfigured() && remoteJid) {
              // Dispara download no bridge (idempotente: retorna imediatamente se já baixado)
              const dl = await bridgeDownload(id, remoteJid);
              const storeBase = "/home/ubuntu/whatsapp-mcp/whatsapp-bridge/store/";
              const relPath = dl.path.startsWith(storeBase) ? dl.path.slice(storeBase.length) : (filenameHint || dl.filename);
              const r = await bridgeMediaBase64(relPath);
              return json({ ok: true, dataUrl: `data:${r.mimetype};base64,${r.base64}`, mimetype: r.mimetype, fileName: r.fileName });
            }
            // Fallback: Evolution API
            const { evoMediaBase64 } = await import("@/integrations/zapi.server");
            const r = await evoMediaBase64(id, remoteJid, fromMe);
            return json({ ok: true, dataUrl: `data:${r.mimetype};base64,${r.base64}`, mimetype: r.mimetype, fileName: r.fileName });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao baixar mídia" }, { status: 502 });
          }
        }

        // Meta: salva o token (só no servidor, key fora de WFA_CLOUD_KEYS — não vaza pro front).
        if (action === "set-meta-config") {
          if (!ctx.isAdmin) return json({ error: "Apenas admin pode alterar a conexão do Meta." }, { status: 403 });
          const token = String(body.token ?? "").trim();
          try {
            await ctx.db.from("workflowark_state").upsert({ key: "wfa-meta-secret", data: { token } });
            return json({ ok: true });
          } catch (e) { return json({ error: (e as Error)?.message || "Falha ao salvar" }, { status: 502 }); }
        }
        if (action === "meta-status") {
          try {
            const { data: row } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-meta-secret").maybeSingle();
            const token = (row?.data as any)?.token || "";
            if (!token) return json({ ok: true, configured: false });
            const r = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=name,account_id,currency&limit=200&access_token=${encodeURIComponent(token)}`);
            const d: any = await r.json().catch(() => ({}));
            if (!r.ok || d.error) return json({ ok: true, configured: true, error: d?.error?.message || "Token inválido ou sem permissão", accounts: [] });
            return json({ ok: true, configured: true, accounts: (d.data || []).map((a: any) => ({ id: a.account_id, name: a.name, currency: a.currency })) });
          } catch (e) { return json({ error: (e as Error)?.message || "Falha" }, { status: 502 }); }
        }
        if (action === "meta-relatorio") {
          const accountId = String(body.accountId ?? "").replace(/[^0-9]/g, "");
          const preset = String(body.preset ?? "last_30d").replace(/[^a-z0-9_]/g, "");
          if (!accountId) return json({ error: "Conta obrigatória" }, { status: 400 });
          try {
            const { data: row } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-meta-secret").maybeSingle();
            const token = (row?.data as any)?.token || "";
            if (!token) return json({ error: "Meta não conectado" }, { status: 400 });
            const fields = "spend,impressions,clicks,cpc,ctr,reach,actions";
            const r = await fetch(`https://graph.facebook.com/v21.0/act_${accountId}/insights?fields=${fields}&date_preset=${encodeURIComponent(preset)}&access_token=${encodeURIComponent(token)}`);
            const d: any = await r.json().catch(() => ({}));
            if (!r.ok || d.error) return json({ error: d?.error?.message || "Falha no relatório" }, { status: 502 });
            return json({ ok: true, insights: (d.data && d.data[0]) || null });
          } catch (e) { return json({ error: (e as Error)?.message || "Falha" }, { status: 502 }); }
        }

        // Voz premium do JARVIS via Fish Audio. Segredo: FISH_API_KEY.
        // Voz (reference_id) configurável; default = a que o Gabriel escolheu.
        if (action === "tts") {
          const text = String(body.text ?? "").slice(0, 1200).trim();
          if (!text) return json({ error: "Sem texto" }, { status: 400 });
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const key = zapiEnv("FISH_API_KEY");
          if (!key) return json({ ok: false, nokey: true });
          const voice = String(body.voice || zapiEnv("FISH_VOICE_ID") || "ec426c7ea3554caba8a5b077a4c701aa");
          const model = String(body.model || "s2-pro");
          try {
            const r = await fetch("https://api.fish.audio/v1/tts", {
              method: "POST",
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify({ text, reference_id: voice, format: "mp3", model }),
            });
            if (!r.ok) { const e = await r.text().catch(() => ""); return json({ ok: false, error: "Fish Audio: " + r.status + " " + e.slice(0, 200) }, { status: 502 }); }
            const buf = await r.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let bin = ""; const CH = 0x8000;
            for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CH)));
            return json({ ok: true, audio: btoa(bin) });
          } catch (e) { return json({ ok: false, error: (e as Error)?.message || "Falha no TTS" }, { status: 502 }); }
        }

        // Google Calendar: status da conexão
        if (action === "google-status") {
          try {
            const { googleConfig, getStoredOAuth } = await import("@/integrations/google.server");
            const { clientId } = googleConfig();
            const rec = await getStoredOAuth(ctx.db);
            return json({ ok: true, configured: !!clientId, connected: !!(rec && rec.refresh_token), email: rec?.email || "" });
          } catch (e) { return json({ error: (e as Error)?.message || "Falha" }, { status: 502 }); }
        }
        // Google Calendar: cria eventos (JARVIS marca a agenda). body.events = [{title,date,time?,durationMin?,notes?}]
        if (action === "google-cal-create") {
          const events = Array.isArray(body.events) ? body.events.slice(0, 30) : [];
          if (!events.length) return json({ error: "Sem eventos" }, { status: 400 });
          try {
            const { createCalendarEvent } = await import("@/integrations/google.server");
            const results: any[] = [];
            for (const ev of events) {
              try { const r = await createCalendarEvent(ctx.db, ev); results.push({ ok: true, title: ev.title, link: r.htmlLink }); }
              catch (e) { results.push({ ok: false, title: ev.title, error: (e as Error)?.message || "falha" }); }
            }
            const criados = results.filter((r) => r.ok).length;
            return json({ ok: true, criados, total: events.length, results });
          } catch (e) { return json({ error: (e as Error)?.message || "Falha ao criar eventos" }, { status: 502 }); }
        }

        // JARVIS: assistente de voz conversacional da ARK (respostas curtas, faladas).
        if (action === "jarvis") {
          const msgs = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
          const pergunta = String(body.pergunta ?? "").trim();
          if (!msgs.length && !pergunta) return json({ error: "Diga algo." }, { status: 400 });
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return json({ error: "IA não configurada (sem ANTHROPIC_API_KEY)." }, { status: 500 });
          let ctxInfo = "";
          try {
            const { data: trow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-tarefas").maybeSingle();
            const tarefas: any[] = Array.isArray(trow?.data) ? trow.data : [];
            const hoje = hojeSP();
            const atras = tarefas.filter((t) => t.data && t.data < hoje && t.status !== "concluido").length;
            const abertas = tarefas.filter((t) => t.status !== "concluido").length;
            ctxInfo = `\n\nDADOS AGORA: ${abertas} tarefas abertas, ${atras} atrasadas.`;
          } catch { /* ignore */ }
          const sys = `Você é o JARVIS — a inteligência da ARK Content, inspirada DIRETAMENTE no JARVIS do Homem de Ferro. Seu "Senhor" é o Gabriel Andrade, dono da agência; você trabalha PARA ele, ele não trabalha para você.
TOM: formal, sofisticado, calmo e impecável, como um mordomo-engenheiro britânico (em português). Trate-o por "Senhor". Seja levemente espirituoso quando couber, nunca informal demais, nunca gíria. Antecipe necessidades. Confiante e preciso.
FORMATO: respostas CURTAS e diretas (serão FALADAS em voz alta — 1 a 3 frases). Sem markdown, sem emoji. Comece muitas respostas com "Senhor," quando fizer sentido.
PAPEL: você é o comandante operacional da agência (a mesma inteligência do Conselho). Ajuda com operação, clientes, decisões, e EXECUTA ações no sistema quando pedido. Se for uma ação, confirme que está executando ("Pois não, Senhor. Abrindo..."). Não invente dados; se faltar, diga o que precisa.
Exemplos de tom: "Senhor, todos os sistemas estão online e operando com a máxima eficiência." / "Como desejar, Senhor. Reunindo o conselho." / "Permita-me sugerir priorizarmos a Vivenda hoje."${ctxInfo}`;
          const messages = msgs.length ? msgs.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") })).filter((m: any) => m.content) : [{ role: "user", content: pergunta }];
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01", "anthropic-beta": "prompt-caching-2024-07-31" }, body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 400, system: [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }], messages }) });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            return json({ ok: true, reply: data?.content?.[0]?.text || "(sem resposta)" });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha no JARVIS" }, { status: 502 });
          }
        }

        // JARVIS-AGENTE: Claude COM FERRAMENTAS. Recebe o comando + contexto, decide
        // sozinho quais ações executar (não depende de frases programadas). O cliente
        // executa as ações devolvidas. É a "minha capacidade" transferida pro JARVIS.
        if (action === "jarvis-agent") {
          const msgs = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
          if (!msgs.length) return json({ error: "Diga algo." }, { status: 400 });
          const ctx2 = body.contexto && typeof body.contexto === "object" ? body.contexto : {};
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return json({ error: "IA não configurada" }, { status: 500 });
          // memória do JARVIS (aprende preferências do Gabriel)
          let memoria: string[] = [];
          try { const { data } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-jarvis-memory").maybeSingle(); if (Array.isArray(data?.data)) memoria = data.data.slice(-40); } catch { /* */ }
          const tools = [
            { name: "navegar", description: "Abre uma página/aba do sistema.", input_schema: { type: "object", properties: { pagina: { type: "string", description: "ex: dashboard, lista-clientes, tarefas, financeiro, cobranca, acerto, agentes, conselho, whatsapp, roteirista, legenda, planejamento, drive, agenda, processos, organograma, integracoes, cliente, meumes" } }, required: ["pagina"] } },
            { name: "abrir_cliente", description: "Abre a ficha de um cliente pelo nome.", input_schema: { type: "object", properties: { nome: { type: "string" } }, required: ["nome"] } },
            { name: "criar_tarefa", description: "Cria uma tarefa.", input_schema: { type: "object", properties: { titulo: { type: "string" }, responsavel: { type: "string", description: "nome da pessoa OU área (tráfego, social, account, design, edição, captação, comercial)" }, cliente: { type: "string" }, data: { type: "string", description: "YYYY-MM-DD" }, prioridade: { type: "string", enum: ["alta", "media", "baixa"] } }, required: ["titulo"] } },
            { name: "concluir_tarefa", description: "Marca uma tarefa como concluída (busca pelo título).", input_schema: { type: "object", properties: { titulo: { type: "string" } }, required: ["titulo"] } },
            { name: "designar_tarefa", description: "Atribui uma tarefa a uma pessoa.", input_schema: { type: "object", properties: { titulo: { type: "string" }, responsavel: { type: "string" } }, required: ["titulo", "responsavel"] } },
            { name: "mudar_tarefa", description: "Muda data e/ou prioridade de uma tarefa.", input_schema: { type: "object", properties: { titulo: { type: "string" }, data: { type: "string" }, prioridade: { type: "string", enum: ["alta", "media", "baixa"] } }, required: ["titulo"] } },
            { name: "agendar_evento", description: "Cria um evento no Google Calendar e na agenda.", input_schema: { type: "object", properties: { titulo: { type: "string" }, data: { type: "string", description: "YYYY-MM-DD" }, hora: { type: "string", description: "HH:MM" } }, required: ["titulo", "data"] } },
            { name: "rodar_conselho", description: "Dispara o Conselho de IA para debater os clientes agora.", input_schema: { type: "object", properties: {} } },
            { name: "distribuir_tarefas_conselho", description: "Reatribui as tarefas criadas pelo conselho às pessoas certas.", input_schema: { type: "object", properties: {} } },
            { name: "gerar_roteiro", description: "Gera roteiros de Reels para um cliente sobre um tema.", input_schema: { type: "object", properties: { cliente: { type: "string" }, tema: { type: "string" } }, required: ["tema"] } },
            { name: "resumir_whatsapp", description: "Gera o resumo das conversas do WhatsApp das últimas 24h.", input_schema: { type: "object", properties: {} } },
            { name: "analisar_whatsapp", description: "Analisa a EFETIVIDADE do atendimento no WhatsApp (tempos de resposta, leads não respondidos, conversão).", input_schema: { type: "object", properties: {} } },
            { name: "apagar_tarefas_cliente", description: "Apaga TODAS as tarefas de um cliente (pelo nome).", input_schema: { type: "object", properties: { cliente: { type: "string" } }, required: ["cliente"] } },
            { name: "lembrar", description: "Guarda uma preferência/fato importante do Gabriel pra lembrar sempre.", input_schema: { type: "object", properties: { fato: { type: "string" } }, required: ["fato"] } },
          ];
          const sys =
            "Você é o JARVIS da ARK Content (inspirado no JARVIS do Homem de Ferro). Trate o Gabriel por 'Senhor', formal e conciso (será falado). " +
            "Você AGE no sistema usando as ferramentas disponíveis — escolha a(s) ferramenta(s) certa(s) para o pedido. Pode usar várias. " +
            "Para perguntas (status, atrasadas, quem tem o quê), responda em TEXTO curto usando o CONTEXTO; só use ferramenta se for uma ação. " +
            "Sempre devolva também uma frase curta confirmando o que fez (1-2 frases, sem markdown). " +
            `\n\nCONTEXTO AGORA: ${JSON.stringify(ctx2).slice(0, 3500)}` +
            (memoria.length ? `\n\nO QUE VOCÊ JÁ APRENDEU SOBRE O GABRIEL: ${memoria.join("; ")}` : "");
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01", "anthropic-beta": "prompt-caching-2024-07-31" }, body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 700, system: [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }], tools, messages: msgs.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") })).filter((m: any) => m.content) }) });
            const d: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: d?.error?.message || "Falha na IA" }, { status: 502 });
            const blocks: any[] = Array.isArray(d?.content) ? d.content : [];
            const say = blocks.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
            const actions = blocks.filter((b) => b.type === "tool_use").map((b) => ({ tool: b.name, input: b.input || {} }));
            // grava memória se o JARVIS pediu pra lembrar
            const lembrar = actions.filter((a) => a.tool === "lembrar").map((a) => String(a.input?.fato || "")).filter(Boolean);
            if (lembrar.length) { try { memoria = memoria.concat(lembrar).slice(-60); await ctx.db.from("workflowark_state").upsert({ key: "wfa-jarvis-memory", data: memoria }); } catch { /* */ } }
            return json({ ok: true, say: say || "", actions: actions.filter((a) => a.tool !== "lembrar"), aprendeu: lembrar });
          } catch (e) { return json({ error: (e as Error)?.message || "Falha no JARVIS" }, { status: 502 }); }
        }

        // Conselho de IA: especialistas da ARK debatem o tema e consolidam decisão + plano.
        if (action === "conselho") {
          const tema = String(body.tema ?? "").trim();
          const cliente = String(body.cliente ?? "").trim();
          if (!tema) return json({ error: "Escreva o que o conselho deve resolver." }, { status: 400 });
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return json({ error: "IA não configurada (sem ANTHROPIC_API_KEY)." }, { status: 500 });
          let brief = "";
          if (cliente) { try { const { clienteBrief } = await import("@/integrations/clientes"); brief = clienteBrief(cliente) || ""; } catch { /* ignore */ } }
          const sys = `Você simula o CONSELHO DE IA da ARK Content (agência de marketing gastronômico em Brasília). Membros: Diretor de Operações, Gestor de Tráfego, Social Media, Roteirista, Designer, Account/CS, Comercial. Eles DEBATEM o tema (cada um na sua ótica, podem discordar) e o Diretor consolida numa decisão clara + plano de ação prático e realista (foco em vender/agendar, orçamento de PME brasileira). Não invente dados; se faltar, diga o que precisa.${brief ? "\n\nCONTEXTO DO CLIENTE:\n" + brief : ""}\n\nResponda SOMENTE com JSON válido: {"debate":[{"agente":"...","fala":"..."}],"plano":["..."],"decisao":"..."}. Cada "fala" curta (1-2 frases). 4 a 7 membros. "plano" com 3-6 ações objetivas. "decisao" em 2-3 linhas.`;
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 1600, system: sys, messages: [{ role: "user", content: `Tema pro conselho debater: ${tema}${cliente ? ` (cliente: ${cliente})` : ""}` }] }) });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            let raw: string = data?.content?.[0]?.text || "";
            raw = raw.replace(/```json|```/g, "").trim();
            const m = raw.match(/\{[\s\S]*\}/);
            const parsed = m ? JSON.parse(m[0]) : { debate: [], plano: [], decisao: raw };
            return json({ ok: true, debate: parsed.debate || [], plano: parsed.plano || [], decisao: parsed.decisao || "" });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha no conselho" }, { status: 502 });
          }
        }

        // Chat individual com um membro do Conselho de IA (persona fixa, conversa multi-turno).
        if (action === "agente-chat") {
          const persona = String(body.persona ?? "").trim();
          const msgs = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
          if (!persona || !msgs.length) return json({ error: "Diga com quem falar e o que perguntar." }, { status: 400 });
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return json({ error: "IA não configurada (sem ANTHROPIC_API_KEY)." }, { status: 500 });
          const PERSONAS: Record<string, string> = {
            diretor: "o DIRETOR DE OPERAÇÕES: visão de dono, prioriza o que gera receita e destrava a operação, corta o que é perfumaria",
            trafego: "o GESTOR DE TRÁFEGO: performance, Meta Ads, CAC/ROAS, verba de PME brasileira, teste rápido e corte do que não performa",
            social: "o SOCIAL MEDIA: linha editorial, formatos que engajam em gastronomia/varejo, frequência realista pra equipe pequena",
            roteirista: "o ROTEIRISTA VIRAL: ganchos de 3 segundos, retenção, roteiro pronto pra gravar, nada de clichê de IA",
            designer: "o DESIGNER: identidade, criativo que para o scroll, hierarquia visual, o que dá pra produzir rápido sem perder padrão",
            account: "o ACCOUNT/CS: relação com o cliente, expectativa, retenção e churn, o que prometer e o que não prometer",
            comercial: "o ESTRATEGISTA COMERCIAL: pipeline, proposta, fechamento, upsell, o argumento que faz o dono do restaurante assinar",
          };
          const papel = PERSONAS[persona] || `o ${persona}`;
          const cliente = String(body.cliente ?? "").trim();
          let brief = "";
          if (cliente) { try { const { clienteBrief } = await import("@/integrations/clientes"); brief = clienteBrief(cliente) || ""; } catch { /* ignore */ } }
          const sys = `Você é ${papel} do Conselho de IA da ARK Content (agência de marketing gastronômico em Brasília). Converse como colega sênior: direto, prático, PT-BR, respostas curtas (até ~150 palavras), sempre terminando em decisão ou próximo passo concreto. Não invente números; se faltar dado, diga qual.${brief ? "\n\nCONTEXTO DO CLIENTE:\n" + brief : ""}`;
          const messages = msgs
            .map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 4000) }))
            .filter((m: any) => m.content);
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 900, system: sys, messages }) });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            return json({ text: data?.content?.[0]?.text || "(sem resposta)" });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha no chat." }, { status: 502 });
          }
        }

        // Resumo executivo das conversas de WhatsApp das últimas 24h (IA).
        if (action === "wa-resumo") {
          try {
            const { zapiEnv } = await import("@/integrations/zapi.server");
            const aiKey = zapiEnv("ANTHROPIC_API_KEY");
            if (!aiKey) return json({ error: "IA não configurada (sem ANTHROPIC_API_KEY)." }, { status: 500 });
            const { data: row } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-whatsapp").maybeSingle();
            const st: any = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : { conversas: {} };
            const convs: any[] = Object.values(st.conversas || {});
            const since = Date.now() - 24 * 3600 * 1000;
            const recent = convs.filter((c) => (c.updatedAt || 0) > since).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 25);
            let digest = "";
            recent.forEach((c) => {
              const msgs = (c.msgs || []).filter((m: any) => (m.ts || 0) > since).slice(-8);
              if (!msgs.length) return;
              digest += `\n--- ${c.nome || c.phone}${c.isGroup ? " (grupo)" : ""}${c.labels && c.labels.length ? " [" + c.labels.join(",") + "]" : ""} ---\n`;
              msgs.forEach((m: any) => { digest += `${m.dir === "out" ? "Você" : (m.sender || c.nome || "Contato")}: ${String(m.text || "").slice(0, 200)}\n`; });
            });
            if (!digest.trim()) return json({ ok: true, resumo: "Sem conversas novas nas últimas 24h." });
            const sys = "Você é o assistente de operações da ARK Content (agência de marketing gastronômico em Brasília). Recebe as conversas de WhatsApp das últimas 24h e faz um RESUMO EXECUTIVO pro dono (Gabriel), em português, direto e acionável. Estruture: \n⚡ PRECISA DE RESPOSTA/AÇÃO (por contato: o que pedem e o que fazer)\n💰 OPORTUNIDADES / LEADS\n📋 ACOMPANHAMENTOS\n🟢 RESTO (1 linha). Curto e prático. Destaque urgências.";
            const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 1200, system: sys, messages: [{ role: "user", content: `Conversas das últimas 24h:\n${digest.slice(0, 12000)}` }] }) });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            return json({ ok: true, resumo: data?.content?.[0]?.text || "(sem resposta)" });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao resumir" }, { status: 502 });
          }
        }

        // Efetividade do WhatsApp: a ARK (dona + cliente) está sendo eficaz? Tempos de resposta,
        // leads não respondidos, qualidade. Mede + pede veredito da IA.
        if (action === "wa-efetividade") {
          try {
            const { zapiEnv } = await import("@/integrations/zapi.server");
            const aiKey = zapiEnv("ANTHROPIC_API_KEY");
            if (!aiKey) return json({ error: "IA não configurada" }, { status: 500 });
            const { data: row } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-whatsapp").maybeSingle();
            const st: any = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : { conversas: {} };
            const convs: any[] = Object.values(st.conversas || {}).filter((c: any) => !c.isGroup); // foco em 1:1 (leads/clientes)
            const semana = Date.now() - 7 * 86400 * 1000;
            let pend = 0, respondidos = 0; let somaResp = 0, nResp = 0; const naoRespondidos: string[] = [];
            convs.forEach((c: any) => {
              const msgs = (c.msgs || []).filter((m: any) => (m.ts || 0) > semana);
              if (!msgs.length) return;
              const last = msgs[msgs.length - 1];
              if (last && last.dir === "in") { pend++; if (naoRespondidos.length < 12) naoRespondidos.push(`${c.nome || c.phone}: "${String(last.text || "").slice(0, 80)}"`); }
              else respondidos++;
              // tempo de resposta: pares in->out
              for (let i = 1; i < msgs.length; i++) { if (msgs[i].dir === "out" && msgs[i - 1].dir === "in" && msgs[i].ts && msgs[i - 1].ts) { somaResp += (msgs[i].ts - msgs[i - 1].ts); nResp++; } }
            });
            const tempoMedioMin = nResp ? Math.round(somaResp / nResp / 60000) : 0;
            const metr = { conversas: convs.length, naoRespondidas: pend, respondidas: respondidos, tempoMedioRespostaMin: tempoMedioMin };
            const sys = "Você é o Diretor de Operações IA da ARK Content. Avalie a EFETIVIDADE do atendimento por WhatsApp (a ARK é dona do software e também faz o próprio marketing). Seja direto e honesto. Em português, curto: \n1) VEREDITO (estamos eficazes? nota 0-10 e por quê)\n2) RISCOS (leads/clientes não respondidos que podem esfriar)\n3) 3 AÇÕES concretas pra melhorar conversão e tempo de resposta. Use os números e os exemplos.";
            const user = `MÉTRICAS (últimos 7 dias, conversas 1:1): ${JSON.stringify(metr)}.\nNÃO RESPONDIDOS (última msg foi do contato):\n${naoRespondidos.join("\n") || "nenhum"}`;
            const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 900, system: sys, messages: [{ role: "user", content: user }] }) });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            const analise = data?.content?.[0]?.text || "";
            // guarda como notificação (o Gabriel vê de manhã)
            try {
              const { data: nRow, error: nErr } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-notificacoes").maybeSingle();
              if (!nErr) { const arr = Array.isArray(nRow?.data) ? nRow.data : []; arr.unshift({ id: "wae" + Date.now(), ts: Date.now(), lido: false, tipo: "efetividade", texto: "📊 Efetividade do WhatsApp: " + analise }); await ctx.db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) }); }
            } catch { /* */ }
            return json({ ok: true, metricas: metr, analise });
          } catch (e) { return json({ error: (e as Error)?.message || "Falha" }, { status: 502 }); }
        }

        // Define as tags (labels) de uma conversa (ex: ARK, ALPHA) — persiste na nuvem.
        if (action === "wa-set-labels") {
          const phone = String(body.phone ?? "").replace(/\D/g, "");
          const labels = Array.isArray(body.labels) ? body.labels.map((x: any) => String(x)).slice(0, 8) : [];
          if (!phone) return json({ error: "phone obrigatório" }, { status: 400 });
          try {
            const { data: row } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-whatsapp").maybeSingle();
            const st: any = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : { conversas: {} };
            if (st.conversas && st.conversas[phone]) {
              st.conversas[phone].labels = labels;
              await ctx.db.from("workflowark_state").upsert({ key: "wfa-whatsapp", data: st });
            }
            return json({ ok: true });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao salvar tags" }, { status: 502 });
          }
        }

        // Marca uma conversa como LIDA (zera não-lidas) — persiste na nuvem E no WhatsApp real.
        if (action === "wa-mark-read") {
          const phone = String(body.phone ?? "").replace(/\D/g, "");
          if (!phone) return json({ error: "phone obrigatório" }, { status: 400 });
          try {
            const { data: row } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-whatsapp").maybeSingle();
            const st: any = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : { conversas: {} };
            const c = st.conversas && st.conversas[phone];
            if (c) {
              c.unread = 0;
              await ctx.db.from("workflowark_state").upsert({ key: "wfa-whatsapp", data: st });
              // reflete no WhatsApp real (best-effort): marca as recebidas como lidas
              try {
                const { evoMarkRead } = await import("@/integrations/zapi.server");
                const keys = (c.msgs || [])
                  .filter((m: any) => m && m.dir === "in" && m.mkey && m.mkey.id)
                  .slice(-30)
                  .map((m: any) => ({ id: m.mkey.id, remoteJid: m.mkey.remoteJid || c.jid || phone, fromMe: false }));
                await evoMarkRead(keys);
              } catch { /* best-effort */ }
            }
            return json({ ok: true });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao marcar como lido" }, { status: 502 });
          }
        }

        // Marca TODAS as conversas como lidas (botão "marcar todas") — nuvem + WhatsApp real.
        if (action === "wa-mark-all-read") {
          try {
            const { data: row } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-whatsapp").maybeSingle();
            const st: any = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : { conversas: {} };
            const convs = Object.values(st.conversas || {}) as any[];
            let n = 0;
            convs.forEach((c) => { if (c.unread) { c.unread = 0; n++; } });
            await ctx.db.from("workflowark_state").upsert({ key: "wfa-whatsapp", data: st });
            // WhatsApp real (best-effort, só nas que tinham não-lidas, limita p/ não estourar)
            try {
              const { evoMarkRead } = await import("@/integrations/zapi.server");
              const naoLidas = convs.filter((c) => (c.msgs || []).some((m: any) => m && m.dir === "in" && m.mkey)).slice(0, 40);
              for (const c of naoLidas) {
                const keys = (c.msgs || [])
                  .filter((m: any) => m && m.dir === "in" && m.mkey && m.mkey.id)
                  .slice(-10)
                  .map((m: any) => ({ id: m.mkey.id, remoteJid: m.mkey.remoteJid || c.jid || c.phone, fromMe: false }));
                await evoMarkRead(keys);
              }
            } catch { /* best-effort */ }
            return json({ ok: true, marcadas: n });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao marcar todas" }, { status: 502 });
          }
        }

        if (action === "set-my-name") {
          const full_name = String(body.full_name ?? "").trim();
          if (!full_name) return json({ error: "Informe um nome." }, { status: 400 });
          const { error } = await ctx.db
            .from("workflowark_members")
            .update({ full_name })
            .eq("id", ctx.member.id);
          if (error) return json({ error: "Não foi possível salvar o nome." }, { status: 500 });
          return json({ ok: true, full_name });
        }

        if (action === "motor-plano-mensal") {
          const mes = /^\d{4}-\d{2}$/.test(String(body.mes ?? ""))
            ? String(body.mes)
            : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();

          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return json({ error: "IA não configurada." }, { status: 500 });

          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief("vivenda");
          const cap = 3;

          const { data: edRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-editorial").maybeSingle();
          const editorial: any[] = Array.isArray(edRow?.data) ? edRow.data : [];
          const jaNoMes = editorial
            .filter((e: any) => e.clienteId === "vivenda" && String(e.data || "").startsWith(mes))
            .map((e: any) => e.titulo);

          const sys = [
            "Você é o PLANEJADOR DE CONTEÚDO sênior da ARK Content (Brasília). Cria roteiros de captação para a Farmácia Vivenda prontos para gravar.",
            "REGRAS: ganchos que param o scroll — nunca 'Olá pessoal', 'Nesse vídeo', 'Você sabia que'. Primeiro frame é conflito, pergunta ou afirmação chocante. Frases curtas, tom clínico mas acessível. Indique BLOCOS e CTA único.",
            "Responda SOMENTE com JSON válido: {\"roteiros\":[...]}.",
            "Cada roteiro: {\"titulo\":\"título curto e específico\",\"formato\":\"Reels|Feed|Stories|Carrossel\",\"gancho\":\"1ª frase do vídeo (2 linhas max)\",\"roteiro\":\"script completo com BLOCO 1, BLOCO 2 e CTA\",\"melhorDia\":\"YYYY-MM-DD sugerido\"}",
            "CONTEXTO DO CLIENTE (use sempre — pessoas, produtos, protocolos, tom):\n" + brief,
          ].join("\n");

          const userMsg = `Hoje é ${hojeSP()}. Gere ${cap} roteiro(s) de captação para a Vivenda no mês ${mes}.\nJá planejado este mês: ${jaNoMes.join(", ") || "nenhum"}.\nVariar formatos e temas. Conectar com os protocolos (Pós-Mounjaro, Pele em Equilíbrio, 60+ Ativa) e o contexto de Brasília.`;

          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, system: sys, messages: [{ role: "user", content: userMsg }] }),
            });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });

            let raw: string = data?.content?.[0]?.text || "";
            raw = raw.replace(/```json|```/g, "").trim();
            const m = raw.match(/\{[\s\S]*\}/);
            let roteiros: any[] = [];
            if (m) { try { roteiros = JSON.parse(m[0])?.roteiros || []; } catch { roteiros = []; } }
            if (!Array.isArray(roteiros)) roteiros = [];

            const novos = roteiros.map((rt: any) => ({
              id: `mpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              clienteId: "vivenda",
              mes,
              titulo: String(rt.titulo || ""),
              formato: String(rt.formato || "Reels"),
              gancho: String(rt.gancho || ""),
              roteiro: String(rt.roteiro || ""),
              melhorDia: String(rt.melhorDia || ""),
              status: "pendente",
              criadoEm: new Date().toISOString(),
            }));

            const { data: mRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-motor-plano").maybeSingle();
            const planoAtual: any[] = Array.isArray(mRow?.data) ? mRow.data : [];
            const planoNovo = [...novos, ...planoAtual].slice(0, 200);
            await ctx.db.from("workflowark_state").upsert({ key: "wfa-motor-plano", data: planoNovo, updated_by: ctx.user.id });

            return json({ ok: true, gerados: novos.length, roteiros: novos });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao gerar plano." }, { status: 502 });
          }
        }

        if (action === "motor-gerar-legendas") {
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return json({ error: "IA não configurada." }, { status: 500 });

          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief("vivenda");

          const { data: tRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-tarefas").maybeSingle();
          const tarefas: any[] = Array.isArray(tRow?.data) ? tRow.data : [];
          const edicoesConcluidas = tarefas.filter((t: any) =>
            (t.clienteId === "vivenda" || String(t.clienteId || "").includes("vivenda")) &&
            String(t.funcao || "").toLowerCase().includes("edit") &&
            t.status === "concluido"
          );

          const { data: fRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-social-fila").maybeSingle();
          const fila: any[] = Array.isArray(fRow?.data) ? fRow.data : [];
          const jaTemLegenda = new Set(fila.filter((f: any) => f.tarefaId).map((f: any) => f.tarefaId));

          const pendentes = edicoesConcluidas.filter((t: any) => !jaTemLegenda.has(t.id));
          if (!pendentes.length) return json({ ok: true, gerados: 0, msg: "Nenhuma edição nova sem legenda." });

          const sys = [
            "Você é COPYWRITER e SOCIAL MEDIA sênior da ARK Content (Brasília). Crie UMA legenda de Instagram pronta pra postar para a Farmácia Vivenda.",
            "REGRAS: 1ª linha é o GANCHO (para o scroll, nunca 'Você sabia que'). Corpo em 3-4 linhas curtas com respiro. CTA específico. 5 hashtags (nicho + local Brasília).",
            "Responda SOMENTE com JSON: {\"gancho\":\"...\",\"legenda\":\"texto completo formatado\",\"cta\":\"...\",\"hashtags\":\"#... #...\"}",
            "CONTEXTO DO CLIENTE:\n" + brief,
          ].join("\n");

          const resultados = await Promise.all(pendentes.slice(0, 5).map(async (tarefa) => {
            try {
              const userMsg = `Vídeo editado: ${tarefa.title}\n${tarefa.desc ? "Descrição: " + tarefa.desc : ""}`;
              const r = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" },
                body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 800, system: sys, messages: [{ role: "user", content: userMsg }] }),
              });
              const d: any = await r.json().catch(() => ({}));
              if (!r.ok) return null;
              let raw2 = (d?.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
              const m2 = raw2.match(/\{[\s\S]*\}/);
              if (!m2) return null;
              let parsed: any = {};
              try { parsed = JSON.parse(m2[0]); } catch { return null; }
              return {
                id: `leg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                clienteId: "vivenda",
                cliente: "Vivenda",
                tarefaId: tarefa.id,
                date: new Date().toISOString().slice(0, 10),
                ts: Date.now(),
                status: "pendente",
                formato: String((tarefa.tags || [])[0] || "Reels"),
                tema: tarefa.title,
                gancho: parsed.gancho || "",
                roteiro: tarefa.desc || "",
                legenda: parsed.legenda || "",
                cta: parsed.cta || "",
                captacao: "",
                melhorDia: "",
                hashtags: parsed.hashtags || "",
              };
            } catch { return null; }
          }));
          const novasLegendas = resultados.filter(Boolean) as any[];

          if (novasLegendas.length) {
            const filaAtualizada = [...novasLegendas, ...fila].slice(0, 500);
            await ctx.db.from("workflowark_state").upsert({ key: "wfa-social-fila", data: filaAtualizada, updated_by: ctx.user.id });
          }

          return json({ ok: true, gerados: novasLegendas.length });
        }

        if (action === "motor-status") {
          const id = String(body.id ?? "");
          const novoStatus = String(body.status ?? "");
          if (!id || !["aprovado", "descartado", "publicado"].includes(novoStatus)) {
            return json({ error: "Parâmetros inválidos." }, { status: 400 });
          }

          const { data: mRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-motor-plano").maybeSingle();
          const plano: any[] = Array.isArray(mRow?.data) ? mRow.data : [];
          const idx = plano.findIndex((p: any) => p.id === id);
          if (idx < 0) return json({ error: "Roteiro não encontrado." }, { status: 404 });

          plano[idx] = { ...plano[idx], status: novoStatus, atualizadoEm: new Date().toISOString() };

          if (novoStatus === "aprovado") {
            const item = plano[idx];
            const { data: pRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-producao").maybeSingle();
            const producao: any[] = Array.isArray(pRow?.data) ? pRow.data : [];
            producao.unshift({
              id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              clienteId: "vivenda",
              data: item.melhorDia || "",
              produtor: "",
              local: "",
              roteiro: item.roteiro,
              status: "agendada",
              motorPlanoId: item.id,
              titulo: item.titulo,
              videos: [{ id: `vid-${Date.now()}`, titulo: item.titulo, roteiroTrecho: item.gancho, editor: "", prazo: "", status: "fila" }],
            });
            await ctx.db.from("workflowark_state").upsert({ key: "wfa-producao", data: producao.slice(0, 300), updated_by: ctx.user.id });
          }

          await ctx.db.from("workflowark_state").upsert({ key: "wfa-motor-plano", data: plano, updated_by: ctx.user.id });
          return json({ ok: true });
        }

        return json({ error: "Ação inválida" }, { status: 400 });
      },
    },
  },
});
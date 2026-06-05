import { createFileRoute } from "@tanstack/react-router";

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

function readBearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function isStateKey(key: string) {
  return STATE_KEYS.has(key) || key.startsWith("wfa-ckl-");
}

async function getContext(request: Request) {
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

  if (!member || !member.active) {
    return { error: json({ error: "Seu e-mail ainda não foi liberado no WorkFlowArk." }, { status: 403 }) };
  }

  return { db, user, member: member as WorkflowMember, isAdmin: member.role === "admin" };
}

export const Route = createFileRoute("/api/workflowark/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getContext(request);
        if ("error" in ctx) return ctx.error;

        const { data: rows, error } = await ctx.db
          .from("workflowark_state")
          .select("key,data,updated_at");
        if (error) return json({ error: "Não foi possível carregar os dados." }, { status: 500 });

        const state = Object.fromEntries((rows ?? []).map((row: any) => [row.key, row.data]));
        let members: WorkflowMember[] = [];
        if (ctx.isAdmin) {
          const result = await ctx.db
            .from("workflowark_members")
            .select("id,email,full_name,user_id,role,active,permissions")
            .order("created_at", { ascending: true });
          members = result.data ?? [];
        }

        return json({ state, member: ctx.member, members });
      },

      POST: async ({ request }) => {
        const ctx = await getContext(request);
        if ("error" in ctx) return ctx.error;

        const body = await request.json().catch(() => ({}));
        const action = String(body.action ?? "save-state");

        if (action === "save-state") {
          const key = String(body.key ?? "");
          if (!isStateKey(key)) return json({ error: "Bloco inválido" }, { status: 400 });
          const { error } = await ctx.db.from("workflowark_state").upsert({
            key,
            data: body.data ?? null,
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
          if (VALID_ROLES.has(String(body.role))) patch.role = String(body.role);
          if (typeof body.active === "boolean") patch.active = body.id === ctx.member.id ? true : body.active;
          const { error } = await ctx.db.from("workflowark_members").update(patch).eq("id", id);
          if (error) return json({ error: "Não foi possível atualizar o acesso." }, { status: 500 });
          return json({ ok: true });
        }

        return json({ error: "Ação inválida" }, { status: 400 });
      },
    },
  },
});
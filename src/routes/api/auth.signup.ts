import { createFileRoute } from "@tanstack/react-router";

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");
        const full_name = String(body.full_name ?? "").trim() || null;

        if (!/^\S+@\S+\.\S+$/.test(email)) {
          return json({ error: "E-mail inválido." }, { status: 400 });
        }
        if (password.length < 6) {
          return json({ error: "A senha precisa de pelo menos 6 caracteres." }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        // Cria o usuário JÁ confirmado — sem depender de e-mail de confirmação.
        const { data: created, error: cErr } = await db.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (cErr) {
          const msg = String(cErr.message ?? "");
          if (/already|exist|registered|duplicate/i.test(msg)) {
            return json({ error: "Este e-mail já tem uma conta. Use \"Entrar\"." }, { status: 409 });
          }
          return json({ error: "Não foi possível criar a conta. Tente novamente." }, { status: 500 });
        }

        const user = created?.user;

        // Primeiro usuário do sistema vira admin ativo; os demais ficam pendentes de liberação pelo gestor.
        const { count } = await db
          .from("workflowark_members")
          .select("id", { count: "exact", head: true });
        const isFirst = (count ?? 0) === 0;

        await db.from("workflowark_members").upsert(
          {
            email,
            full_name,
            user_id: user?.id ?? null,
            role: isFirst ? "admin" : "viewer",
            active: isFirst,
            created_by: user?.id ?? null,
          },
          { onConflict: "email" },
        );

        return json({ ok: true, pending: !isFirst });
      },
    },
  },
});

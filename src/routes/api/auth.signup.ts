import { papelNovoMembro } from "@/lib/acesso.js";
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

        let user = created?.user;

        if (cErr) {
          const msg = String(cErr.message ?? "");
          if (/already|exist|registered|duplicate/i.test(msg)) {
            // Pode ser uma conta "presa" (criada antes, nunca confirmada). Tenta consertar.
            const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const found = (list?.users ?? []).find(
              (u: any) => String(u.email ?? "").toLowerCase() === email,
            );
            if (found && !found.email_confirmed_at) {
              // Conta nunca confirmada: confirma e redefine a senha informada agora.
              const { data: upd } = await db.auth.admin.updateUserById(found.id, {
                password,
                email_confirm: true,
                user_metadata: { full_name },
              });
              user = upd?.user ?? found;
            } else {
              return json({ error: "Este e-mail já tem uma conta. Use \"Entrar\"." }, { status: 409 });
            }
          } else {
            return json({ error: "Não foi possível criar a conta. Tente novamente." }, { status: 500 });
          }
        }

        // Primeiro usuário do sistema vira admin. Quem foi convidado pelo gestor entra com o
        // papel escolhido. Qualquer outro fica pendente até o admin liberar (24/09/2026, regra
        // em src/lib/acesso.js; de 17/09 a 24/09 entrava direto como viewer).
        const { count } = await db
          .from("workflowark_members")
          .select("id", { count: "exact", head: true });
        const isFirst = (count ?? 0) === 0;
        const { data: existente } = await db
          .from("workflowark_members")
          .select("role,active")
          .eq("email", email)
          .maybeSingle();

        await db.from("workflowark_members").upsert(
          {
            email,
            full_name,
            user_id: user?.id ?? null,
            ...papelNovoMembro({ isFirst, existente }),
            created_by: user?.id ?? null,
          },
          { onConflict: "email" },
        );

        // Aviso no sino do gestor (mesmo formato do avisarPrimeiraEntrada do state).
        if (!isFirst) {
          try {
            const { data: nRow, error: nErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-notificacoes").maybeSingle();
            if (!nErr) {
              const arr = Array.isArray(nRow?.data) ? nRow.data : [];
              arr.unshift({ id: "login" + Date.now(), ts: Date.now(), lido: false, tipo: "acesso", texto: `🔓 ${full_name ? `${full_name} (${email})` : email} criou conta e está aguardando liberação. Libere em Configurações > Equipe.` });
              await db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) });
            }
          } catch { /* aviso é cortesia */ }
        }

        const final = papelNovoMembro({ isFirst, existente });
        return json({ ok: true, pending: !final.active });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

// Cria/garante 3 contas de avaliação (professores da banca) JÁ liberadas, com papel "avaliador".
// Uso: GET /api/auth/seed-evaluators?key=ark-2026
// Idempotente: pode ser chamado várias vezes; só garante que as contas existam e estejam ativas.
const SEED_KEY = "ark-2026";
const PASSWORD = "ArkAvaliacao2026";
const EVALUATORS = [
  { email: "professor1@workflowark.com.br", full_name: "Professor(a) Avaliador(a) 1" },
  { email: "professor2@workflowark.com.br", full_name: "Professor(a) Avaliador(a) 2" },
  { email: "professor3@workflowark.com.br", full_name: "Professor(a) Avaliador(a) 3" },
];

export const Route = createFileRoute("/api/auth/seed-evaluators")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("key") !== SEED_KEY) {
          return json({ error: "Chave inválida." }, { status: 403 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const results: Array<{ email: string; password: string; status: string }> = [];

        // lista uma vez para localizar contas já existentes
        const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const users = (list?.users ?? []) as any[];

        for (const ev of EVALUATORS) {
          const email = ev.email.toLowerCase();
          let user: any = null;
          let status = "criado";

          const existing = users.find((u) => String(u.email ?? "").toLowerCase() === email);
          if (existing) {
            // garante senha conhecida + e-mail confirmado
            const { data: upd } = await db.auth.admin.updateUserById(existing.id, {
              password: PASSWORD,
              email_confirm: true,
              user_metadata: { full_name: ev.full_name },
            });
            user = upd?.user ?? existing;
            status = "atualizado";
          } else {
            const { data: created } = await db.auth.admin.createUser({
              email,
              password: PASSWORD,
              email_confirm: true,
              user_metadata: { full_name: ev.full_name },
            });
            user = created?.user ?? null;
          }

          // libera o acesso já como "avaliador" (ativo, sem precisar do gestor aprovar)
          await db.from("workflowark_members").upsert(
            {
              email,
              full_name: ev.full_name,
              user_id: user?.id ?? null,
              role: "avaliador",
              active: true,
            },
            { onConflict: "email" },
          );

          results.push({ email, password: PASSWORD, status });
        }

        return json({
          ok: true,
          mensagem:
            "Acessos de avaliação prontos. Compartilhe os dados abaixo com os professores. Todos usam a mesma senha.",
          login_url: url.origin + "/auth",
          acessos: results,
        });
      },
    },
  },
});

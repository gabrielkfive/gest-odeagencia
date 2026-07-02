import { createFileRoute } from "@tanstack/react-router";

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

// Cria/garante 3 contas de avaliação (professores da banca) JÁ liberadas, com papel "avaliador".
// Uso: GET /api/auth/seed-evaluators?key=<segredo RUN_KEY>            -> cria/reativa
//      GET /api/auth/seed-evaluators?key=<segredo RUN_KEY>&off=1      -> DESATIVA (pós-defesa)
// A antiga chave fixa "ark-2026" + senha conhecida no repo público eram uma porta de entrada
// aberta; agora exige o segredo RUN_KEY (wrangler secret) e dá pra fechar as contas com &off=1.
import { runSecret } from "@/integrations/run-auth.server";
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
        const secret = runSecret();
        if (!secret || url.searchParams.get("key") !== secret) {
          return json({ error: "Chave inválida." }, { status: 403 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const results: Array<{ email: string; password: string; status: string }> = [];

        // lista uma vez para localizar contas já existentes
        const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const users = (list?.users ?? []) as any[];

        // MODO DESLIGAR (&off=1): pós-defesa, fecha as contas de avaliação — desativa o
        // membro e troca a senha por uma aleatória (a senha antiga era pública no repo).
        if (url.searchParams.get("off") === "1") {
          for (const ev of EVALUATORS) {
            const email = ev.email.toLowerCase();
            const existing = users.find((u: any) => String(u.email ?? "").toLowerCase() === email);
            if (existing) {
              const scrambled = "off-" + crypto.randomUUID() + crypto.randomUUID();
              await db.auth.admin.updateUserById(existing.id, { password: scrambled });
            }
            await db.from("workflowark_members").update({ active: false }).eq("email", email);
            results.push({ email, password: "(desativada)", status: existing ? "desativado" : "não existia" });
          }
          return json({ ok: true, mensagem: "Contas de avaliação desativadas.", acessos: results });
        }

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

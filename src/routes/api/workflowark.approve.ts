import { createFileRoute } from "@tanstack/react-router";

// Rota PÚBLICA (sem login) de aprovação de conteúdo pelo cliente.
// O token na URL é o segredo: quem tem o link vê/aprova aquele plano (estilo "link de
// compartilhamento"). A criação do link é autenticada (action create-approval em state.ts);
// aqui o cliente só LÊ o plano e GRAVA a decisão dele.

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

const keyFor = (token: string) => `wfa-approval-${String(token || "").replace(/[^a-zA-Z0-9]/g, "")}`;

async function getDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const Route = createFileRoute("/api/workflowark/approve")({
  server: {
    handlers: {
      // GET /api/workflowark/approve?t=TOKEN  -> devolve o plano + status atual
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("t") || "";
        if (!token) return json({ error: "Link inválido." }, { status: 400 });
        const db = await getDb();
        const { data, error } = await db
          .from("workflowark_state")
          .select("data")
          .eq("key", keyFor(token))
          .maybeSingle();
        if (error) return json({ error: "Não foi possível carregar." }, { status: 500 });
        if (!data?.data) return json({ error: "Aprovação não encontrada (link errado ou removido)." }, { status: 404 });
        return json({ ok: true, approval: data.data });
      },

      // POST { token, items?, feedback?, status } -> grava a decisão do cliente
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({} as any));
        const token = String(body.token ?? "");
        if (!token) return json({ error: "Link inválido." }, { status: 400 });
        const db = await getDb();
        const { data: row } = await db
          .from("workflowark_state")
          .select("data")
          .eq("key", keyFor(token))
          .maybeSingle();
        const cur = row?.data as any;
        if (!cur) return json({ error: "Aprovação não encontrada." }, { status: 404 });
        if (body.items && typeof body.items === "object") cur.items = body.items;
        if (typeof body.feedback === "string") cur.feedback = body.feedback.slice(0, 4000);
        if (body.status === "approved" || body.status === "changes") cur.status = body.status;
        cur.decidedAt = new Date().toISOString();
        const { error } = await db.from("workflowark_state").upsert({ key: keyFor(token), data: cur });
        if (error) return json({ error: "Não foi possível salvar sua resposta." }, { status: 500 });
        return json({ ok: true });
      },
    },
  },
});

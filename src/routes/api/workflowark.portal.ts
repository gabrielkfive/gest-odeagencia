import { createFileRoute } from "@tanstack/react-router";

// Rota PÚBLICA do Portal do Cliente (sem login). Token na URL = segredo.
// GET: devolve o plano de conteúdo AO VIVO do cliente. POST: cria uma demanda do cliente.

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}
const portalKey = (t: string) => `wfa-portal-${String(t || "").replace(/[^a-zA-Z0-9]/g, "")}`;

async function getDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function readState(db: any, key: string) {
  const { data } = await db.from("workflowark_state").select("data").eq("key", key).maybeSingle();
  return data?.data ?? null;
}

export const Route = createFileRoute("/api/workflowark/portal")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("t") || "";
        if (!token) return json({ error: "Link inválido." }, { status: 400 });
        const db = await getDb();
        const portal = await readState(db, portalKey(token));
        if (!portal?.cliente) return json({ error: "Portal não encontrado." }, { status: 404 });

        // Bloqueia acesso se o cliente está em churn
        const customClients: any[] = (await readState(db, "wfa-clientes-custom")) || [];
        const clienteNorm = String(portal.cliente).toLowerCase();
        const clienteCustom = customClients.find((c: any) =>
          String(c.nm || "").toLowerCase() === clienteNorm || String(c.id || "").toLowerCase() === clienteNorm
        );
        if (clienteCustom?.status === "churn") {
          return json({ error: "Este portal não está mais disponível." }, { status: 403 });
        }

        const plano = (await readState(db, "wfa-planejamento")) || {};
        const pk = portal.planKey && plano[portal.planKey] ? portal.planKey
          : Object.keys(plano).find((k) => String(plano[k]?.cliente || "").toLowerCase() === clienteNorm);
        const plan = pk ? plano[pk] : null;
        return json({
          ok: true,
          cliente: portal.cliente,
          agency: portal.agency || "ARK Content",
          periodo: plan?.periodo || "",
          ideias: Array.isArray(plan?.ideias) ? plan.ideias : [],
        });
      },

      // POST { t, titulo, mensagem } -> cria demanda do cliente em wfa-demandas
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({} as any));
        const token = String(body.t ?? body.token ?? "");
        const titulo = String(body.titulo ?? "").trim().slice(0, 200);
        const mensagem = String(body.mensagem ?? "").trim().slice(0, 4000);
        if (!token) return json({ error: "Link inválido." }, { status: 400 });
        if (!titulo && !mensagem) return json({ error: "Escreva o que você precisa." }, { status: 400 });
        const db = await getDb();
        const portal = await readState(db, portalKey(token));
        if (!portal?.cliente) return json({ error: "Portal não encontrado." }, { status: 404 });
        const arr = (await readState(db, "wfa-demandas")) || [];
        const list = Array.isArray(arr) ? arr : [];
        list.unshift({
          id: "d" + Date.now(),
          titulo: titulo || "Demanda do cliente",
          mensagem,
          cliente: portal.cliente,
          origem: "portal",
          status: "aberta",
          criadaEm: new Date().toISOString(),
        });
        const { error } = await db.from("workflowark_state").upsert({ key: "wfa-demandas", data: list });
        if (error) return json({ error: "Não foi possível enviar a demanda." }, { status: 500 });

        // Cria notificação interna para a equipe ver no sino
        try {
          const notifs: any[] = (await readState(db, "wfa-notificacoes")) || [];
          notifs.unshift({
            id: "portal-" + Date.now(),
            texto: `🌐 Demanda do portal · ${portal.cliente}: "${titulo || "Demanda do cliente"}"`,
            ts: new Date().toISOString(),
          });
          await db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: notifs.slice(0, 200) });
        } catch { /* não quebra o fluxo do cliente se a notificação falhar */ }

        return json({ ok: true });
      },
    },
  },
});

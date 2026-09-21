import { createFileRoute } from "@tanstack/react-router";
import { derivarEntregas, aplicarDecisaoCliente } from "@/lib/entregas.js";
import clientesBase from "@/lib/clientes-base.json";

// Rota PÚBLICA do Portal do Cliente (sem login). Token na URL = segredo.
// GET: devolve o plano de conteúdo AO VIVO do cliente. POST: cria uma demanda do cliente.

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}
const portalKey = (t: string) => `wfa-portal-${String(t || "").replace(/[^a-zA-Z0-9]/g, "")}`;

const normTxt = (v: unknown) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
// O portal guarda o NOME do cliente; as tarefas usam o id (clientes-base + custom). Resolve os dois.
function idsDoCliente(nomePortal: string, custom: any[]): string[] {
  const n = normTxt(nomePortal);
  const ids = new Set<string>([n]);
  for (const [id, nm] of Object.entries(clientesBase as Record<string, string>)) if (normTxt(nm) === n || normTxt(id) === n) ids.add(normTxt(id));
  for (const c of custom || []) if (c && (normTxt(c.nm || c.nome) === n || normTxt(c.id) === n)) ids.add(normTxt(c.id));
  return [...ids];
}
function tarefasDoCliente(tarefas: any[], ids: string[]) {
  return (Array.isArray(tarefas) ? tarefas : []).filter((t) => t && (ids.includes(normTxt(t.clienteId)) || (!t.clienteId && ids.some((i) => i && normTxt(t.title).includes(i)))));
}

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

        const demandasArr = (await readState(db, "wfa-demandas")) || [];
        const minhasDemandas = (Array.isArray(demandasArr) ? demandasArr : [])
          .filter((dm: any) => String(dm.cliente || "").toLowerCase() === clienteNorm && dm.origem === "portal")
          .map((dm: any) => ({ id: dm.id, titulo: dm.titulo, criadaEm: dm.criadaEm, status: dm.status }))
          .slice(0, 20);

        // Entregas e aprovações (lote 2 de 21/09): só as tarefas deste cliente, só campos do cliente
        const ids = idsDoCliente(portal.cliente, customClients);
        const tarefas = (await readState(db, "wfa-tarefas")) || [];
        const { entregas, aprovacoes } = derivarEntregas(tarefasDoCliente(tarefas, ids).map((t: any) => ({ ...t, clienteId: ids[0] })), ids[0], new Date().toISOString());

        return json({
          ok: true,
          cliente: portal.cliente,
          agency: portal.agency || "ARK Content",
          periodo: plan?.periodo || "",
          ideias: Array.isArray(plan?.ideias) ? plan.ideias : [],
          demandas: minhasDemandas,
          entregas,
          aprovacoes,
        });
      },

      // POST { t, titulo, mensagem } -> cria demanda do cliente em wfa-demandas
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({} as any));
        const token = String(body.t ?? body.token ?? "");
        const acao = String(body.acao ?? "");
        if (acao === "aprovar" || acao === "ajustar") {
          if (!token) return json({ error: "Link inválido." }, { status: 400 });
          const db = await getDb();
          const portal = await readState(db, portalKey(token));
          if (!portal?.cliente) return json({ error: "Portal não encontrado." }, { status: 404 });
          const customClients: any[] = (await readState(db, "wfa-clientes-custom")) || [];
          const ids = idsDoCliente(portal.cliente, customClients);
          const lista: any[] = (await readState(db, "wfa-tarefas")) || [];
          const alvo = tarefasDoCliente(lista, ids).find((t) => t.id === String(body.id || ""));
          if (!alvo) return json({ error: "Item não encontrado." }, { status: 404 });
          let novo: any;
          try { novo = aplicarDecisaoCliente(alvo, acao, String(body.comentario ?? ""), new Date().toISOString()); }
          catch (e) { return json({ error: (e as Error).message }, { status: 400 }); }
          // grava só este item: relê a lista na hora e troca o item pelo id (o app mescla por `up`)
          const atual: any[] = (await readState(db, "wfa-tarefas")) || [];
          const gravar = (Array.isArray(atual) ? atual : []).map((t) => (t && t.id === novo.id ? novo : t));
          const { error } = await db.from("workflowark_state").upsert({ key: "wfa-tarefas", data: gravar });
          if (error) return json({ error: "Não foi possível registrar. Tente de novo." }, { status: 500 });
          try {
            const notifs: any[] = (await readState(db, "wfa-notificacoes")) || [];
            notifs.unshift({ id: "portal-" + Date.now(), texto: `🌐 ${portal.cliente} ${acao === "aprovar" ? "aprovou" : "pediu ajuste em"}: "${alvo.title || ""}"${acao === "ajustar" ? " · " + String(body.comentario || "").slice(0, 120) : ""}`, ts: new Date().toISOString() });
            await db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: notifs.slice(0, 200) });
          } catch { /* notificação não bloqueia o cliente */ }
          return json({ ok: true, status: novo.status });
        }
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

import { createFileRoute } from "@tanstack/react-router";

// PONTE CLAUDE CODE ↔ WORKFLOWARK (pedido do Gabriel, 16/07):
// canal seguro pro Claude Code (em qualquer máquina) LER o estado do sistema e
// ADICIONAR trabalho pronto — sem depender de sessão de navegador logada.
// É a base do "organismo vivo": o agente de fora enxerga tarefas/demandas/agenda
// e devolve material pronto pra dentro do sistema.
//
//   GET  /api/workflowark/bridge?key=<BRIDGE_KEY>&state=wfa-tarefas   -> lê 1 bloco
//   POST /api/workflowark/bridge?key=<BRIDGE_KEY>
//        {action:"tarefas-add", tarefas:[...], notificar:"texto opcional"}
//
// Segurança: exige BRIDGE_KEY (wrangler secret put BRIDGE_KEY); aceita RUN_KEY
// como fallback (mesmo padrão do remote). Chaves sensíveis (-secret/-oauth) nunca
// saem. Escrita é SEMPRE append-only com dedupe — a ponte não apaga nem encolhe nada.

async function bridgeSecretOk(url: URL): Promise<boolean> {
  const key = url.searchParams.get("key") || "";
  if (!key) return false;
  let bridge = "";
  try {
    const { env } = await import("cloudflare:workers");
    bridge = (env as Record<string, string | undefined>)?.BRIDGE_KEY || "";
  } catch {
    bridge = (typeof process !== "undefined" ? process.env?.BRIDGE_KEY : "") || "";
  }
  if (bridge && key === bridge) return true;
  const { runSecret } = await import("@/integrations/run-auth.server");
  const run = await runSecret();
  return !!run && key === run;
}

const isSensitive = (k: string) => /-(secret|oauth)$/.test(k);
// título normalizado p/ dedupe (sem acento, minúsculo, espaços colapsados)
const norm = (s: string) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

export const Route = createFileRoute("/api/workflowark/bridge")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        if (!(await bridgeSecretOk(u))) return Response.json({ error: "unauthorized" }, { status: 401 });
        const key = String(u.searchParams.get("state") || "");
        if (!key || isSensitive(key)) return Response.json({ error: "state inválido" }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const { data: row, error } = await db.from("workflowark_state").select("key,data").eq("key", key).maybeSingle();
        if (error) return Response.json({ error: "falha ao ler" }, { status: 500 });
        return Response.json({ key, data: row?.data ?? null });
      },
      POST: async ({ request }) => {
        const u = new URL(request.url);
        if (!(await bridgeSecretOk(u))) return Response.json({ error: "unauthorized" }, { status: 401 });
        const body: any = await request.json().catch(() => ({}));
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        if (body?.action === "tarefas-add") {
          const novas: any[] = Array.isArray(body.tarefas) ? body.tarefas : [];
          if (!novas.length) return Response.json({ error: "sem tarefas" }, { status: 400 });
          const { data: tRow, error: tErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-tarefas").maybeSingle();
          // só escreve se a LEITURA veio OK (padrão do agents-run: nunca arrisca a lista real)
          if (tErr) return Response.json({ error: "falha ao ler tarefas" }, { status: 500 });
          const tarefas: any[] = Array.isArray(tRow?.data) ? tRow.data.slice() : [];
          const abertas = new Set(
            tarefas.filter((t) => t && t.status !== "concluido").map((t) => norm(t.title) + "|" + String(t.clienteId || "")),
          );
          const criadas: string[] = [];
          const puladas: string[] = [];
          novas.slice(0, 60).forEach((n, i) => {
            const title = String(n?.title || "").slice(0, 140).trim();
            if (!title) return;
            const cid = String(n?.clienteId || "");
            if (abertas.has(norm(title) + "|" + cid)) { puladas.push(title); return; }
            tarefas.push({
              id: "brg" + Date.now() + "_" + i,
              title,
              desc: String(n?.desc || "").slice(0, 500),
              funcao: String(n?.funcao || ""),
              clienteId: cid,
              resp: String(n?.resp || ""),
              data: String(n?.data || ""),
              prio: ["alta", "media", "baixa"].includes(n?.prio) ? n.prio : "media",
              status: "backlog",
              tags: Array.isArray(n?.tags) ? n.tags.slice(0, 5).map((t: any) => String(t).slice(0, 30)) : [],
              checklist: [],
              sprintN: null,
              origem: "claude-bridge",
              criadaEm: new Date().toISOString(),
            });
            abertas.add(norm(title) + "|" + cid);
            criadas.push(title);
          });
          if (criadas.length) {
            const { error: upErr } = await db.from("workflowark_state").upsert({ key: "wfa-tarefas", data: tarefas });
            if (upErr) return Response.json({ error: "falha ao salvar" }, { status: 500 });
          }
          // UMA notificação resumindo o lote (regra do Gabriel: nada de flood)
          const aviso = String(body?.notificar || "").slice(0, 400);
          if (criadas.length && aviso) {
            const { data: nRow, error: nErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-notificacoes").maybeSingle();
            if (!nErr) {
              const arr = Array.isArray(nRow?.data) ? nRow.data : [];
              arr.unshift({ id: "brg" + Date.now(), ts: Date.now(), lido: false, tipo: "bridge", texto: aviso });
              await db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) });
            }
          }
          return Response.json({ ok: true, criadas: criadas.length, puladas });
        }

        return Response.json({ error: "action inválida" }, { status: 400 });
      },
    },
  },
});

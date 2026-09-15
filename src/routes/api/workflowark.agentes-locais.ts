import { createFileRoute } from "@tanstack/react-router";

// AGENTES LOCAIS (Ollama no PC do Gabriel, set/26). Ponte entre o PC e o WorkFlowArk.
//
//   GET  ?desde=<ts>            página /agentes lê a fila (wfa-agentes-fila) e o pedido de rodada.
//   POST {op:"push", itens[]}   o PC manda itens novos (merge por id; status do servidor vence).
//   POST {op:"decide", id, decisao, quem}   a página aprova/recusa UM item (nunca sobrescreve a fila).
//   POST {op:"cmd", agente}     a página pede uma rodada; o PC lê e executa.
//   POST {op:"ack", ids[], cmdTs}  o PC marca itens como executados e limpa o pedido atendido.
//
// Autorização: chave RUN_KEY / RUN_KEY_LOCAL (o PC) ou Bearer de membro ativo (a página).
// A fila é SERVER-OWNED: fica fora do sync do cliente (não está em STATE_KEYS) e o limite é
// de 400 itens, os mais novos primeiro.

const FILA = "wfa-agentes-fila";
const CMD = "wfa-agentes-cmd";
const LIMITE = 400;
const STATUS = new Set(["pendente", "aprovado", "recusado", "executado"]);

export const Route = createFileRoute("/api/workflowark/agentes-locais")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const { isRunAuthorized } = await import("@/integrations/run-auth.server");
        if (!(await isRunAuthorized(request, u))) return Response.json({ error: "unauthorized" }, { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const [f, c] = await Promise.all([
          db.from("workflowark_state").select("data").eq("key", FILA).maybeSingle(),
          db.from("workflowark_state").select("data").eq("key", CMD).maybeSingle(),
        ]);
        const fila: any[] = Array.isArray(f.data?.data) ? f.data.data : [];
        return Response.json({ ok: true, fila, cmd: c.data?.data ?? null });
      },

      POST: async ({ request }) => {
        const u = new URL(request.url);
        const { isRunAuthorized } = await import("@/integrations/run-auth.server");
        if (!(await isRunAuthorized(request, u))) return Response.json({ error: "unauthorized" }, { status: 401 });
        let body: any = {};
        try { body = await request.json(); } catch { body = {}; }
        const op = String(body.op ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const ler = async (key: string) => {
          const { data } = await db.from("workflowark_state").select("data").eq("key", key).maybeSingle();
          return data?.data ?? null;
        };
        const gravar = async (key: string, value: any) => {
          const { error } = await db.from("workflowark_state").upsert({ key, data: value });
          if (error) throw new Error(error.message);
        };

        try {
          if (op === "push") {
            const novos: any[] = Array.isArray(body.itens) ? body.itens : [];
            const fila: any[] = (await ler(FILA)) || [];
            const porId = new Map<string, any>(fila.map((i) => [String(i?.id), i]));
            let adicionados = 0;
            for (const n of novos) {
              const id = String(n?.id ?? "");
              if (!id) continue;
              const atual = porId.get(id);
              if (!atual) {
                porId.set(id, { ...n, status: STATUS.has(n.status) ? n.status : "pendente", recebidoEm: new Date().toISOString() });
                adicionados++;
              } else if (n.status === "executado" && atual.status !== "executado") {
                porId.set(id, { ...atual, status: "executado", resultado: n.resultado ?? atual.resultado });
              }
            }
            const lista = Array.from(porId.values())
              .sort((a, b) => String(b.criado ?? "").localeCompare(String(a.criado ?? "")))
              .slice(0, LIMITE);
            await gravar(FILA, lista);
            const pendentesExecucao = lista.filter((i) => i.status === "aprovado" && !i.executadoNoPc);
            return Response.json({ ok: true, adicionados, total: lista.length, aprovados: pendentesExecucao, cmd: (await ler(CMD)) ?? null });
          }

          if (op === "decide") {
            const id = String(body.id ?? "");
            const decisao = String(body.decisao ?? "");
            if (!id || !["aprovado", "recusado", "pendente"].includes(decisao)) return Response.json({ error: "Parâmetros inválidos." }, { status: 400 });
            const fila: any[] = (await ler(FILA)) || [];
            const idx = fila.findIndex((i) => String(i?.id) === id);
            if (idx < 0) return Response.json({ error: "Item não encontrado." }, { status: 404 });
            fila[idx] = { ...fila[idx], status: decisao, decididoPor: String(body.quem ?? ""), decididoEm: new Date().toISOString() };
            await gravar(FILA, fila);
            return Response.json({ ok: true });
          }

          if (op === "cmd") {
            const agente = String(body.agente ?? "todos");
            await gravar(CMD, { agente, ts: Date.now(), pedidoPor: String(body.quem ?? "") });
            return Response.json({ ok: true });
          }

          if (op === "ack") {
            const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [];
            const resultados: Record<string, string> = body.resultados && typeof body.resultados === "object" ? body.resultados : {};
            if (ids.length) {
              const fila: any[] = (await ler(FILA)) || [];
              for (const i of fila) {
                if (ids.includes(String(i?.id))) {
                  i.status = "executado";
                  i.executadoNoPc = new Date().toISOString();
                  if (resultados[String(i.id)]) i.resultado = resultados[String(i.id)];
                }
              }
              await gravar(FILA, fila);
            }
            if (body.cmdTs) {
              const c = await ler(CMD);
              if (c && Number(c.ts) === Number(body.cmdTs)) await gravar(CMD, null);
            }
            return Response.json({ ok: true });
          }

          return Response.json({ error: "op inválida" }, { status: 400 });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
        }
      },
    },
  },
});

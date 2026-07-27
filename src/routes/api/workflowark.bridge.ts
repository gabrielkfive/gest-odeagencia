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

        // Editar/remover SÓ tarefas criadas pela própria ponte (origem claude-bridge):
        // a ponte nunca toca no que o time criou. Edita título/desc/data/prio; remove por id.
        if (body?.action === "tarefas-edit" || body?.action === "tarefas-remove") {
          const { data: tRow, error: tErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-tarefas").maybeSingle();
          if (tErr) return Response.json({ error: "falha ao ler tarefas" }, { status: 500 });
          const tarefas: any[] = Array.isArray(tRow?.data) ? tRow.data.slice() : [];
          const minha = (t: any) => t && t.origem === "claude-bridge";
          let mudou = 0;
          let final = tarefas;
          if (body.action === "tarefas-remove") {
            const ids = new Set((Array.isArray(body.ids) ? body.ids : []).map(String));
            final = tarefas.filter((t) => { const sai = minha(t) && ids.has(String(t.id)); if (sai) mudou++; return !sai; });
          } else {
            const edits: any[] = Array.isArray(body.edits) ? body.edits : [];
            edits.forEach((e) => {
              const t = tarefas.find((x) => minha(x) && String(x.id) === String(e?.id));
              if (!t) return;
              if (typeof e.title === "string" && e.title.trim()) t.title = e.title.slice(0, 140).trim();
              if (typeof e.desc === "string") t.desc = e.desc.slice(0, 500);
              if (typeof e.data === "string") t.data = e.data.slice(0, 10);
              if (typeof e.clienteId === "string") t.clienteId = e.clienteId.slice(0, 40);
              if (["alta", "media", "baixa"].includes(e.prio)) t.prio = e.prio;
              t.up = new Date().toISOString(); // carimbo: a edição da ponte vence cópia velha de cliente no merge
              mudou++;
            });
          }
          if (mudou) {
            const { error: upErr } = await db.from("workflowark_state").upsert({ key: "wfa-tarefas", data: final });
            if (upErr) return Response.json({ error: "falha ao salvar" }, { status: 500 });
          }
          return Response.json({ ok: true, alteradas: mudou });
        }

        // Grava o planejamento mensal de UM cliente (mesmo formato do planSalvar do
        // sistema: objeto por planKey). Substitui só a entrada daquele cliente.
        if (body?.action === "planejamento-set") {
          const cliente = String(body.cliente || "").slice(0, 80).trim();
          const periodo = String(body.periodo || "").slice(0, 120).trim();
          const ideias: any[] = Array.isArray(body.ideias) ? body.ideias.slice(0, 40) : [];
          if (!cliente || !ideias.length) return Response.json({ error: "cliente e ideias obrigatórios" }, { status: 400 });
          const planKey = norm(cliente).includes("vivenda") ? "vivenda" : norm(cliente).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cliente";
          const { data: pRow, error: pErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-planejamento").maybeSingle();
          if (pErr) return Response.json({ error: "falha ao ler planejamento" }, { status: 500 });
          const plano = pRow?.data && typeof pRow.data === "object" && !Array.isArray(pRow.data) ? { ...pRow.data } : {};
          plano[planKey] = {
            cliente, periodo,
            ideias: ideias.map((i) => ({
              tema: String(i?.tema || "").slice(0, 160),
              angulo: String(i?.angulo || "").slice(0, 400),
              legenda: String(i?.legenda || "").slice(0, 400),
              dia: String(i?.dia || "").slice(0, 30),
              formato: String(i?.formato || "").slice(0, 30),
              produto: String(i?.produto || "").slice(0, 60),
              data: /^\d{4}-\d{2}-\d{2}$/.test(String(i?.data || "")) ? String(i.data) : "",
            })),
            updatedAt: Date.now(),
          };
          const { error: upErr } = await db.from("workflowark_state").upsert({ key: "wfa-planejamento", data: plano });
          if (upErr) return Response.json({ error: "falha ao salvar" }, { status: 500 });
          return Response.json({ ok: true, planKey, ideias: plano[planKey].ideias.length });
        }

        // Agenda captações na Produção — append-only com dedupe por (clienteId+data).
        if (body?.action === "producao-add") {
          const novas: any[] = Array.isArray(body.captacoes) ? body.captacoes.slice(0, 20) : [];
          if (!novas.length) return Response.json({ error: "sem captações" }, { status: 400 });
          const { data: cRow, error: cErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-producao").maybeSingle();
          if (cErr) return Response.json({ error: "falha ao ler produção" }, { status: 500 });
          const producao: any[] = Array.isArray(cRow?.data) ? cRow.data.slice() : [];
          const jaTem = new Set(producao.map((c) => String(c?.clienteId || "") + "|" + String(c?.data || "")));
          const criadas: string[] = [];
          novas.forEach((n, i) => {
            const data = /^\d{4}-\d{2}-\d{2}$/.test(String(n?.data || "")) ? String(n.data) : "";
            const cid = String(n?.clienteId || "").slice(0, 40);
            if (!data || !cid || jaTem.has(cid + "|" + data)) return;
            producao.push({
              id: "brgcap" + Date.now() + "_" + i,
              clienteId: cid,
              data,
              titulo: String(n?.titulo || "").slice(0, 140),
              roteiro: String(n?.roteiro || "").slice(0, 2000),
              status: "agendada",
              origem: "claude-bridge",
              videos: [],
            });
            jaTem.add(cid + "|" + data);
            criadas.push(data);
          });
          if (criadas.length) {
            const { error: upErr } = await db.from("workflowark_state").upsert({ key: "wfa-producao", data: producao });
            if (upErr) return Response.json({ error: "falha ao salvar" }, { status: 500 });
          }
          return Response.json({ ok: true, criadas: criadas.length });
        }

        // Cadastrar clientes personalizados (append-only + dedupe por id/nome).
        // Mesmo formato que o app usa em wfa-clientes-custom; Gabriel ajusta plano/valor no Editar.
        if (body?.action === "clientes-add") {
          const novos: any[] = Array.isArray(body.clientes) ? body.clientes : [];
          if (!novos.length) return Response.json({ error: "sem clientes" }, { status: 400 });
          const { data: cRow, error: cErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-clientes-custom").maybeSingle();
          if (cErr) return Response.json({ error: "falha ao ler clientes" }, { status: 500 });
          const clientes: any[] = Array.isArray(cRow?.data) ? cRow.data.slice() : [];
          const existe = (id: string, nm: string) =>
            clientes.some((c) => String(c?.id) === id || norm(String(c?.nm || "")) === norm(nm));
          const criados: string[] = [];
          novos.slice(0, 10).forEach((n) => {
            const id = String(n?.id || "").slice(0, 40).trim();
            const nm = String(n?.nm || "").slice(0, 80).trim();
            if (!id || !nm || existe(id, nm)) return;
            clientes.push({
              id, nm,
              tipo: n?.tipo === "Alpha" ? "Alpha" : "ARK",
              plano: String(n?.plano || "A definir").slice(0, 40),
              valor: Number(n?.valor) || 0,
              status: "gr",
              cap: Number(n?.cap) || 0,
              meta: String(n?.meta || "Novo cliente · ajuste plano e valor no botão Editar").slice(0, 140),
              extra: String(n?.extra || "Novo cliente").slice(0, 140),
            });
            criados.push(nm);
          });
          if (criados.length) {
            const { error: upErr } = await db.from("workflowark_state").upsert({ key: "wfa-clientes-custom", data: clientes });
            if (upErr) return Response.json({ error: "falha ao salvar" }, { status: 500 });
          }
          return Response.json({ ok: true, criados });
        }

        // Uma notificação avulsa (sem tarefa junto). Continua valendo a regra anti-flood:
        // quem chama manda UM texto consolidado, não N avisos.
        if (body?.action === "notificar") {
          const texto = String(body?.texto || "").slice(0, 600).trim();
          if (!texto) return Response.json({ error: "sem texto" }, { status: 400 });
          const { data: nRow, error: nErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-notificacoes").maybeSingle();
          if (nErr) return Response.json({ error: "falha ao ler notificações" }, { status: 500 });
          const arr = Array.isArray(nRow?.data) ? nRow.data : [];
          arr.unshift({ id: "brg" + Date.now(), ts: Date.now(), lido: false, tipo: "bridge", texto });
          const { error: upErr } = await db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) });
          if (upErr) return Response.json({ error: "falha ao salvar" }, { status: 500 });
          return Response.json({ ok: true });
        }

        return Response.json({ error: "action inválida" }, { status: 400 });
      },
    },
  },
});

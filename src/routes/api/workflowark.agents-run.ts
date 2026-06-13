import { createFileRoute } from "@tanstack/react-router";

// Agentes autônomos: roda 1x/dia (idempotente) — gera o resumo do WhatsApp e uma
// ideia do conselho, e guarda como NOTIFICAÇÃO. Pode ser chamado por cron (Cloudflare
// ou cron-job.org). Protegido por ?key=. Use ?force=1 pra forçar.
//   /api/workflowark/agents-run?key=ark-2026
const RUN_KEY = "ark-2026";

export const Route = createFileRoute("/api/workflowark/agents-run")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        if (u.searchParams.get("key") !== RUN_KEY) return Response.json({ error: "unauthorized" }, { status: 401 });
        const force = u.searchParams.get("force") === "1";
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;
          const hoje = new Date().toISOString().split("T")[0];
          const { data: lastRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-agents-lastrun").maybeSingle();
          if (!force && (lastRow?.data as any)?.date === hoje) return Response.json({ ok: true, ran: false, motivo: "já rodou hoje" });

          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return Response.json({ error: "sem ANTHROPIC_API_KEY" }, { status: 500 });

          // 1) Resumo do WhatsApp das últimas 24h
          const { data: waRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-whatsapp").maybeSingle();
          const st: any = waRow?.data && typeof waRow.data === "object" ? waRow.data : { conversas: {} };
          const convs: any[] = Object.values(st.conversas || {});
          const since = Date.now() - 24 * 3600 * 1000;
          let digest = "";
          convs.filter((c) => (c.updatedAt || 0) > since).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 25).forEach((c) => {
            const msgs = (c.msgs || []).filter((m: any) => (m.ts || 0) > since).slice(-8);
            if (!msgs.length) return;
            digest += `\n--- ${c.nome || c.phone}${c.isGroup ? " (grupo)" : ""} ---\n`;
            msgs.forEach((m: any) => { digest += `${m.dir === "out" ? "Você" : (m.sender || c.nome || "Contato")}: ${String(m.text || "").slice(0, 180)}\n`; });
          });

          const callAI = async (sys: string, user: string, max = 900) => {
            const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: max, system: sys, messages: [{ role: "user", content: user }] }) });
            const d: any = await r.json().catch(() => ({}));
            return r.ok ? (d?.content?.[0]?.text || "") : "";
          };

          const notifs: any[] = [];
          if (digest.trim()) {
            const resumo = await callAI(
              "Você é o assistente da ARK Content. Resuma as conversas de WhatsApp das últimas 24h em poucas linhas: o que precisa de resposta/ação e leads. Curto e direto, em português.",
              `Conversas:\n${digest.slice(0, 11000)}`,
            );
            if (resumo) notifs.push({ tipo: "resumo", texto: "🧠 Resumo automático do dia (WhatsApp):\n" + resumo });
          }
          // 2) Ideia do conselho pro dia
          const ideia = await callAI(
            "Você é o Diretor de Operações IA da ARK Content (agência de marketing gastronômico). Dê UMA ideia/ação prática e específica pra HOJE que ajude a agência a vender mais ou economizar tempo. 1-2 frases, em português, direto.",
            "Qual a melhor ação pra hoje?",
            200,
          );
          if (ideia) notifs.push({ tipo: "ideia", texto: "💡 Ideia do dia (Conselho de IA): " + ideia });

          if (notifs.length) {
            const { data: nRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-notificacoes").maybeSingle();
            const arr = Array.isArray(nRow?.data) ? nRow.data : [];
            notifs.forEach((n) => arr.unshift({ id: "auto" + Date.now() + Math.floor(Math.random() * 999), ts: Date.now(), lido: false, ...n }));
            await db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) });
          }
          await db.from("workflowark_state").upsert({ key: "wfa-agents-lastrun", data: { date: hoje, ts: Date.now() } });
          return Response.json({ ok: true, ran: true, notificacoes: notifs.length });
        } catch (e) {
          return Response.json({ error: (e as Error)?.message || "falha" }, { status: 500 });
        }
      },
    },
  },
});

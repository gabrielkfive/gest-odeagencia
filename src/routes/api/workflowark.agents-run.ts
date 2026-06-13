import { createFileRoute } from "@tanstack/react-router";

// Agentes autônomos 24/7 (idempotente, 1x/dia). Roda o "Conselho de IA" sozinho:
// - resume o WhatsApp das últimas 24h
// - pra cada cliente prioritário, faz um DEBATE do conselho (nicho, referências,
//   parcerias) -> decisão + plano + tarefas reais (entram em wfa-tarefas)
// - guarda os briefings em wfa-conselho-briefings (o app mostra de manhã)
// - notifica em wfa-notificacoes
// Chamável por cron (Cloudflare/cron-job.org). Protegido por ?key=. ?force=1 força.
//   /api/workflowark/agents-run?key=ark-2026
const RUN_KEY = "ark-2026";

// Catálogo enxuto p/ dar contexto de nicho ao conselho (espelha CLIENTES_BASE do app).
const CLIENTES_CTX: { id: string; nm: string; seg: string; nota: string }[] = [
  { id: "vivenda", nm: "Vivenda", seg: "Farmácia de manipulação / dermocosméticos (cremes de ureia, NAC, cafeína)", nota: "MAIOR ticket, prioritário. 3 captações/mês. Plano de Copa. Decisores: Remerson (pai), Graziella, Yuri." },
  { id: "fercon", nm: "Fercon", seg: "Gastronomia", nota: "2 captações/mês, mais reativo que ativo — provocar pauta." },
  { id: "sasse", nm: "Sasse Gifts", seg: "Presentes / gifts", nota: "2 captações/mês." },
  { id: "cachu", nm: "Cachu Restaurante", seg: "Restaurante (food porn)", nota: "Saudável, acompanhar ROAS, conteúdo qui-dom." },
  { id: "attra", nm: "Attraversiamo Café", seg: "Cafeteria", nota: "Bombando (+1k seguidores em 3 dias) — surfar a onda." },
  { id: "brisa", nm: "Brisa Doce Café", seg: "Cafeteria / doces", nota: "Onboarding + inauguração." },
];

export const Route = createFileRoute("/api/workflowark/agents-run")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        if (u.searchParams.get("key") !== RUN_KEY) return Response.json({ error: "unauthorized" }, { status: 401 });
        const force = u.searchParams.get("force") === "1";
        // ?cliente=vivenda roda só um cliente (e ignora idempotência) — útil pro botão "rodar agora"
        const soCliente = u.searchParams.get("cliente") || "";
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;
          const hoje = new Date().toISOString().split("T")[0];
          const { data: lastRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-agents-lastrun").maybeSingle();
          if (!force && !soCliente && (lastRow?.data as any)?.date === hoje) return Response.json({ ok: true, ran: false, motivo: "já rodou hoje" });

          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return Response.json({ error: "sem ANTHROPIC_API_KEY" }, { status: 500 });

          const callAI = async (sys: string, user: string, max = 900) => {
            const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: max, system: sys, messages: [{ role: "user", content: user }] }) });
            const d: any = await r.json().catch(() => ({}));
            return r.ok ? (d?.content?.[0]?.text || "") : "";
          };
          const parseJSON = (txt: string) => {
            if (!txt) return null;
            let s = String(txt).replace(/```json|```/g, "").trim();
            const m = s.match(/\{[\s\S]*\}/);
            if (!m) return null;
            let body = m[0];
            try { return JSON.parse(body); } catch {}
            // tenta reparar JSON truncado (resposta cortada por max_tokens): fecha aspas/colchetes
            try {
              let t = body.replace(/,\s*$/, "");
              const opens = (t.match(/\[/g) || []).length, closes = (t.match(/\]/g) || []).length;
              for (let i = 0; i < opens - closes; i++) t += "]";
              if (!t.trim().endsWith("}")) t += "}";
              return JSON.parse(t);
            } catch { return null; }
          };

          const notifs: any[] = [];

          // 1) Resumo do WhatsApp das últimas 24h ------------------------------------
          if (!soCliente) {
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
            if (digest.trim()) {
              const resumo = await callAI(
                "Você é o assistente da ARK Content. Resuma as conversas de WhatsApp das últimas 24h em poucas linhas: o que precisa de resposta/ação e leads. Curto e direto, em português.",
                `Conversas:\n${digest.slice(0, 11000)}`,
              );
              if (resumo) notifs.push({ tipo: "resumo", texto: "🧠 Resumo automático do dia (WhatsApp):\n" + resumo });
            }
          }

          // 2) Conselho autônomo POR CLIENTE ----------------------------------------
          // Pra não estourar o tempo da request (Cloudflare ~limite por request), o run
          // completo é INCREMENTAL: a cada chamada processa só quem ainda não tem briefing
          // de hoje, no máx. MAX_POR_CHAMADA. Várias chamadas no dia completam o conjunto.
          const MAX_POR_CHAMADA = 3;

          // tarefas existentes (pra anexar as novas)
          // SEGURANÇA CONTRA PERDA DE DADOS: se a leitura falhar, NÃO escrevemos nada em
          // wfa-tarefas (senão sobrescreveríamos as tarefas reais com uma lista curta).
          const { data: tRow, error: tErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-tarefas").maybeSingle();
          const tarefasLoadOk = !tErr;
          const tarefasBaseLen = Array.isArray(tRow?.data) ? tRow.data.length : 0;
          const tarefas: any[] = Array.isArray(tRow?.data) ? tRow.data.slice() : [];

          // briefings existentes (mantém os de hoje atualizados, descarta antigos > 14 dias)
          const { data: bRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-conselho-briefings").maybeSingle();
          let briefings: any[] = Array.isArray(bRow?.data) ? bRow.data : [];
          briefings = briefings.filter((b) => (b.ts || 0) > Date.now() - 14 * 86400 * 1000);

          // define quem o conselho vai debater AGORA
          const temHoje = (id: string) => briefings.some((b) => b.clienteId === id && b.date === hoje);
          let alvos = soCliente
            ? CLIENTES_CTX.filter((c) => c.id === soCliente)
            : CLIENTES_CTX.filter((c) => !temHoje(c.id)).slice(0, MAX_POR_CHAMADA);
          const faltam = soCliente ? 0 : CLIENTES_CTX.filter((c) => !temHoje(c.id)).length - alvos.length;

          const sysConselho =
            "Você é o CONSELHO DE IA da ARK Content (agência de marketing de gastronomia/varejo). " +
            "O conselho tem vozes: Diretor de Operações, Gestor de Tráfego, Social Media, Roteirista e Account/CS. " +
            "Pense ALÉM do operacional: aprofunde no nicho do cliente, traga referências de marcas/criadores que estão crescendo no mesmo segmento e ideias de parceria reais. " +
            "Responda SOMENTE em JSON válido, sem texto fora do JSON, no formato: " +
            '{"debate":[{"voz":"Gestor de Tráfego","fala":"..."},{"voz":"Social Media","fala":"..."}],' +
            '"decisao":"frase única e forte","plano":["passo 1","passo 2","passo 3"],' +
            '"tarefas":[{"title":"tarefa acionável curta","resp":"área responsável"}],' +
            '"referencias":["marca/criador + por que olhar"],"parcerias":["ideia de parceria concreta"]}. ' +
            "Máx 3 falas no debate, 3 passos no plano, 3 tarefas, 2 referências, 2 parcerias. Tudo em português, específico e prático.";

          let criadas = 0;
          for (const c of alvos) {
            const raw = await callAI(
              sysConselho,
              `Cliente: ${c.nm}. Segmento: ${c.seg}. Contexto: ${c.nota}. ` +
                `Debata o que ESTE cliente precisa AGORA pra vender mais e crescer, com referências do nicho e uma ideia de parceria. Hoje é ${hoje}.`,
              1600,
            );
            const j = parseJSON(raw);
            if (!j) continue;
            const brief = {
              id: "brf" + c.id + "-" + hoje,
              clienteId: c.id,
              cliente: c.nm,
              date: hoje,
              ts: Date.now(),
              lido: false,
              debate: Array.isArray(j.debate) ? j.debate.slice(0, 3) : [],
              decisao: String(j.decisao || ""),
              plano: Array.isArray(j.plano) ? j.plano.slice(0, 3).map((x: any) => String(x)) : [],
              referencias: Array.isArray(j.referencias) ? j.referencias.slice(0, 2).map((x: any) => String(x)) : [],
              parcerias: Array.isArray(j.parcerias) ? j.parcerias.slice(0, 2).map((x: any) => String(x)) : [],
            };
            // substitui briefing do mesmo cliente+dia se reexecutar
            briefings = briefings.filter((b) => b.id !== brief.id);
            briefings.unshift(brief);

            // cria tarefas (evita duplicar pelo título+cliente no dia)
            const novas = (Array.isArray(j.tarefas) ? j.tarefas : []).slice(0, 3);
            novas.forEach((tk: any, i: number) => {
              const title = String(tk?.title || "").slice(0, 120);
              if (!title) return;
              const dup = tarefas.some((t) => t.clienteId === c.id && (t.title || "") === title && (t.origem === "conselho-auto"));
              if (dup) return;
              const d = new Date(Date.now() + (i + 1) * 86400000).toISOString().split("T")[0];
              tarefas.push({
                id: "ca" + Date.now() + i + c.id, title, desc: "Gerado pelo Conselho de IA (autônomo) · " + c.nm,
                funcao: "", clienteId: c.id, resp: String(tk?.resp || ""), data: d, prio: "media",
                status: "backlog", tags: ["conselho", "auto"], checklist: [], sprintN: null,
                origem: "conselho-auto", criadaEm: new Date().toISOString(),
              });
              criadas++;
            });
            notifs.push({ tipo: "conselho", clienteId: c.id, texto: `🧠 Conselho debateu ${c.nm}: ${brief.decisao}` });
          }

          // persiste tudo — só grava tarefas se a leitura veio OK e o resultado é
          // estritamente maior (append-only). Nunca encolhe a lista real.
          let salvouTarefas = false;
          if (criadas && tarefasLoadOk && tarefas.length >= tarefasBaseLen + 1) {
            const { error: upErr } = await db.from("workflowark_state").upsert({ key: "wfa-tarefas", data: tarefas });
            salvouTarefas = !upErr;
          }
          await db.from("workflowark_state").upsert({ key: "wfa-conselho-briefings", data: briefings.slice(0, 60) });

          if (notifs.length) {
            const { data: nRow, error: nErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-notificacoes").maybeSingle();
            // mesma proteção: só anexa notificações se a leitura veio OK
            if (!nErr) {
              const arr = Array.isArray(nRow?.data) ? nRow.data : [];
              notifs.forEach((n) => arr.unshift({ id: "auto" + Date.now() + Math.floor(Math.random() * 999), ts: Date.now(), lido: false, ...n }));
              await db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) });
            }
          }
          // só marca "rodou hoje" quando TODOS os clientes já têm briefing de hoje
          if (!soCliente && faltam === 0) await db.from("workflowark_state").upsert({ key: "wfa-agents-lastrun", data: { date: hoje, ts: Date.now() } });
          // AUTO-ENCADEIA: se ainda faltam clientes e este lote produziu algo, dispara o
          // próximo lote em background (best-effort) — assim 1 chamada do cron cobre todos.
          if (!soCliente && faltam > 0 && criadas > 0) {
            try { fetch(`${u.origin}/api/workflowark/agents-run?key=${RUN_KEY}`).catch(() => {}); } catch { /* ignore */ }
          }
          return Response.json({ ok: true, ran: true, clientes: alvos.length, faltam, tarefas: criadas, tarefasSalvas: salvouTarefas, notificacoes: notifs.length });
        } catch (e) {
          return Response.json({ error: (e as Error)?.message || "falha" }, { status: 500 });
        }
      },
    },
  },
});

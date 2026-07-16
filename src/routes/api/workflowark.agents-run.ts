import { createFileRoute } from "@tanstack/react-router";
import { hojeSP, dataSP } from "@/lib/datas";

// Agentes autônomos 24/7 (idempotente, 1x/dia). Roda o "Conselho de IA" sozinho:
// - resume o WhatsApp das últimas 24h
// - pra cada cliente prioritário, faz um DEBATE do conselho (nicho, referências,
//   parcerias) -> decisão + plano + tarefas reais (entram em wfa-tarefas)
// - guarda os briefings em wfa-conselho-briefings (o app mostra de manhã)
// - notifica em wfa-notificacoes
// Chamável por cron (Cloudflare/cron-job.org). Protegido por ?key=. ?force=1 força.
//   /api/workflowark/agents-run?key=<segredo RUN_KEY> (cron) ou Authorization: Bearer (UI)
// (auth em @/integrations/run-auth.server, importado dinamicamente no handler)

// Mapeia a área/função sugerida pela IA para a PESSOA responsável (organograma da ARK).
// Assim o conselho atribui a tarefa a quem executa, não a um "agente".
function pessoaPorArea(area: string): string {
  const a = String(area || "").toLowerCase();
  if (/tr[áa]fego|ads|m[íi]dia paga|performance|campanha|gestor de tr/.test(a)) return "Danilo de Lima";
  if (/social|conte[úu]do|criador|community|instagram|reels/.test(a)) return "Maria Luiza";
  if (/account|cs|atendimento|sucesso do cliente|relacionamento/.test(a)) return "Lucas Rosi";
  if (/roteir/.test(a)) return "Maria Luiza";
  if (/design|arte|criativo|pe[çc]a/.test(a)) return "M. Portela";
  if (/edi[çc][ãa]o|editor|v[íi]deo|corte/.test(a)) return "Samuel Magalhães";
  if (/capta/.test(a)) return "Omar";
  if (/comercial|vendas|sdr|prospec|lead/.test(a)) return "Saulo";
  if (/diretor|opera|gest[ãa]o|estrat|ceo|financ/.test(a)) return "Gabriel Andrade";
  return "Gabriel Andrade"; // sem correspondência: cai pro Gabriel decidir
}

// Catálogo enxuto p/ dar contexto de nicho ao conselho (espelha CLIENTES_BASE do app).
const CLIENTES_CTX: { id: string; nm: string; seg: string; nota: string }[] = [
  { id: "vivenda", nm: "Vivenda", seg: "Farmácia de manipulação / dermocosméticos (cremes de ureia, NAC, cafeína)", nota: "MAIOR ticket, prioritário. 3 captações/mês. Plano de Copa. Decisores: Remerson (pai), Graziella, Yuri." },
  { id: "fercon", nm: "Fercon", seg: "Gastronomia", nota: "2 captações/mês, mais reativo que ativo — provocar pauta." },
  { id: "sasse", nm: "Sasse Gifts", seg: "Presentes / gifts personalizados", nota: "2 captações/mês." },
  { id: "cachu", nm: "Cachu Restaurante", seg: "Restaurante (food porn)", nota: "Acompanhar ROAS, conteúdo qui-dom; precisa de consistência diária." },
  { id: "attra", nm: "Attraversiamo Café", seg: "Cafeteria", nota: "Bombando (+1k seguidores em 3 dias) — surfar a onda e monetizar." },
  { id: "brisa", nm: "Brisa Doce Café", seg: "Cafeteria / doces", nota: "Onboarding + inauguração." },
  { id: "fonseca", nm: "Fonseca & Cavalcanti", seg: "Advocacia (compliance OAB)", nota: "1 captação/mês; conteúdo precisa respeitar limites de publicidade da OAB; autoridade." },
  { id: "vaca", nm: "Vaca Velha", seg: "Restaurante / churrascaria", nota: "1 captação/mês (2ª às vezes); ramp-up de receita." },
  { id: "dgust", nm: "Pizzaria Dgust", seg: "Pizzaria", nota: "Cliente NOVO (jul/2026): onboarding, primeira linha editorial e primeiras captações." },
  { id: "kopi-coffee", nm: "Kopi Coffee", seg: "Cafeteria", nota: "Cliente NOVO (jul/2026): onboarding e presença inicial." },
  { id: "cafe-lumiere", nm: "Café Lumière", seg: "Cafeteria", nota: "Cliente NOVO (jul/2026): onboarding, posicionamento e presença inicial." },
  { id: "dom", nm: "Dom Baruka", seg: "Restaurante (Squad Alpha)", nota: "URGENTE: cardápio + iFood + bebidas; auditoria iFood em curso." },
  { id: "stray", nm: "Stray House", seg: "Restaurante/bar (Squad Alpha)", nota: "Recuperação; ROAS ~5; subir criativos novos." },
  { id: "babbo", nm: "Babbo Giovanni", seg: "Restaurante italiano (Squad Alpha)", nota: "Em ajuste; precisa de uma roteirização interessante de Reels, viável de gravar e exportável pro Drive." },
  { id: "ark", nm: "ARK Content", seg: "A PRÓPRIA agência (marketing de gastronomia/varejo) — cliente interno", nota:
      "OBJETIVO: marcar o MÁXIMO de reuniões comerciais (conversão: 10 reuniões = 1 fechamento, então volume de reuniões é tudo). " +
      "Criativo CAMPEÃO no ar no Meta (desde anteontem trouxe 3 reuniões): fala sobre fazer produção audiovisual profissional pra ir mais longe. " +
      "Replicar o sucesso criando um novo criativo/roteiro usando o CASE ATTRAVERSIAMO: ganhou +3 mil seguidores em menos de 10 dias E, mais importante, viu diferença no CAIXA, no balcão e no movimento da loja (não só no Instagram). " +
      "Posicionamento ARK: profissionalismo da equipe de produção audiovisual (captação+edição) + atendimento de qualidade + comercial estabilizado, sempre buscando melhorias. " +
      "Entregar: uma roteirização de captação pra próxima semana com composição de imagens e CHAMADA PARA AÇÃO forte." },
];

export const Route = createFileRoute("/api/workflowark/agents-run")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const { isRunAuthorized, runSecret } = await import("@/integrations/run-auth.server");
        if (!(await isRunAuthorized(request, u))) return Response.json({ error: "unauthorized" }, { status: 401 });
        const force = u.searchParams.get("force") === "1";
        // ?cliente=vivenda roda só um cliente (e ignora idempotência) — útil pro botão "rodar agora"
        const soCliente = u.searchParams.get("cliente") || "";
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;
          const hoje = hojeSP();
          // CONSELHO AUTOMÁTICO DESLIGADO (pedido do Gabriel, 16/06): vinha enchendo o sistema
          // de notificação e tarefa. Agora o conselho SÓ roda manualmente — o botão "Rodar
          // conselho agora" chama com ?force=1 (ou ?cliente=). Qualquer chamada automática
          // (cron externo sem force) não faz nada.
          if (!force && !soCliente) return Response.json({ ok: true, ran: false, motivo: "conselho automático desligado" });

          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return Response.json({ error: "sem ANTHROPIC_API_KEY" }, { status: 500 });

          // model + cache opcionais: conselho usa Sonnet cacheado; resumos simples ficam no Haiku
          const callAI = async (sys: string, user: string, max = 900, model = "claude-haiku-4-5", cache = false) => {
            const hdrs: Record<string, string> = { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" };
            if (cache) hdrs["anthropic-beta"] = "prompt-caching-2024-07-31";
            const sysParam: any = cache ? [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }] : sys;
            const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: hdrs, body: JSON.stringify({ model, max_tokens: max, system: sysParam, messages: [{ role: "user", content: user }] }) });
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
            // EFETIVIDADE: o conselho usa o software pra entender se o atendimento está eficaz
            try {
              const c11: any[] = convs.filter((c) => !c.isGroup);
              const semana = Date.now() - 7 * 86400 * 1000;
              let pend = 0; const naoResp: string[] = []; let somaResp = 0, nResp = 0;
              c11.forEach((c) => {
                const msgs = (c.msgs || []).filter((m: any) => (m.ts || 0) > semana);
                if (!msgs.length) return;
                const last = msgs[msgs.length - 1];
                if (last && last.dir === "in") { pend++; if (naoResp.length < 10) naoResp.push(`${c.nome || c.phone}: "${String(last.text || "").slice(0, 70)}"`); }
                for (let i = 1; i < msgs.length; i++) { if (msgs[i].dir === "out" && msgs[i - 1].dir === "in" && msgs[i].ts && msgs[i - 1].ts) { somaResp += msgs[i].ts - msgs[i - 1].ts; nResp++; } }
              });
              if (c11.length) {
                const tmin = nResp ? Math.round(somaResp / nResp / 60000) : 0;
                const verdict = await callAI(
                  "Você é o Diretor de Operações IA da ARK. Avalie a EFETIVIDADE do atendimento no WhatsApp. Curto, em português: nota 0-10 + 1 frase do porquê + 2 ações pra melhorar conversão/tempo de resposta. Use os números.",
                  `7 dias (1:1): ${c11.length} conversas, ${pend} sem resposta, tempo médio de resposta ${tmin} min.\nNão respondidos:\n${naoResp.join("\n") || "nenhum"}`,
                  500,
                );
                if (verdict) notifs.push({ tipo: "efetividade", texto: `📊 Efetividade do WhatsApp (${pend} sem resposta · ${tmin} min médio):\n` + verdict });
              }
            } catch { /* */ }
          }

          // 2) PAUTA DO DIA + DOCUMENTO DE TRABALHO ---------------------------------
          // Reestruturado (pedido do Gabriel, 03/07): o debate diário de TODOS os clientes
          // com contexto estático virava ruminação ("murro em ponta de faca"). Agora:
          // - PAUTA PREVISÍVEL: 1-2 clientes por dia — quem tem evento/apresentação chegando
          //   na agenda (próximos 7 dias) + um do RODÍZIO semanal (cada cliente ~1x/semana).
          // - CONTEXTO DINÂMICO: tarefas abertas e eventos reais do cliente entram no prompt,
          //   e os títulos do último documento entram como "NÃO REPITA".
          // - SAÍDA = DOCUMENTO: planejamento datado + roteiro pronto + checklist de preparação,
          //   material que a equipe usa na entrega, não opinião.

          const { data: tRow, error: tErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-tarefas").maybeSingle();
          const tarefasLoadOk = !tErr;
          const tarefasBaseLen = Array.isArray(tRow?.data) ? tRow.data.length : 0;
          const tarefas: any[] = Array.isArray(tRow?.data) ? tRow.data.slice() : [];

          const { data: bRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-conselho-briefings").maybeSingle();
          let briefings: any[] = Array.isArray(bRow?.data) ? bRow.data : [];
          briefings = briefings.filter((b) => (b.ts || 0) > Date.now() - 14 * 86400 * 1000);

          const { data: agRow, error: agErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-agenda-events").maybeSingle();
          const agendaOk = !agErr;
          const agenda: any[] = Array.isArray(agRow?.data) ? agRow.data.slice() : [];
          const agendaBaseLen = agenda.length;
          // próximo dia útil a partir de amanhã
          const proxDiaUtil = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + 1 + offset); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return dataSP(d); };

          // sinais reais: eventos dos próximos 7 dias que citam um cliente
          const em7dias = (d: string) => d >= hoje && d <= new Date(Date.now() + 7 * 86400 * 1000).toISOString().split("T")[0];
          const eventosProx = agenda.filter((e) => e && e.date && em7dias(String(e.date)));
          const eventosDo = (c: { id: string; nm: string }) =>
            eventosProx.filter((e) => String(e.clienteId || "") === c.id || String(e.title || "").toLowerCase().includes(c.nm.toLowerCase()));

          const temHoje = (id: string) => briefings.some((b) => b.clienteId === id && b.date === hoje);
          const comEvento = CLIENTES_CTX.filter((c) => eventosDo(c).length > 0);
          const dayIdx = Math.floor(Date.now() / 86400000) % CLIENTES_CTX.length;
          const rodizio = CLIENTES_CTX[dayIdx];
          let alvos = soCliente
            ? CLIENTES_CTX.filter((c) => c.id === soCliente)
            : [...comEvento, rodizio]
                .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
                .filter((c) => !temHoje(c.id))
                .slice(0, 2);
          const faltam = 0; // pauta enxuta por desenho: nada de varrer a carteira inteira

          const sysDoc =
            "Você é o CONSELHO DE IA da ARK Content (agência de marketing de gastronomia/varejo em Brasília) preparando um DOCUMENTO DE TRABALHO pro cliente da pauta de hoje. " +
            "Não é debate nem opinião: é material que a equipe vai USAR (apresentar ao cliente, gravar, postar). " +
            "REGRAS: 1) Específico deste cliente e do MOMENTO dele (use as tarefas abertas e os eventos da semana informados). " +
            "2) PROIBIDO item genérico ('poste mais', 'use stories') e PROIBIDO falar de estoque/inventário. " +
            "3) NÃO repita os títulos listados como 'já sugerido antes' — traga ângulos novos. " +
            "4) Datas do planejamento começam AMANHÃ e cobrem ~7 dias, no formato AAAA-MM-DD. " +
            "Responda SOMENTE em JSON válido: " +
            '{"foco":"1 frase: o foco da semana deste cliente e porquê agora",' +
            '"planejamento":[{"data":"AAAA-MM-DD","formato":"Reels|Carrossel|Story|Foto","titulo":"...","gancho":"1 linha"}],' +
            '"roteiro":"roteiro COMPLETO do post mais importante: GANCHO + 3 cenas descritas + CTA + legenda com 3 hashtags (texto corrido, quebras de linha)",' +
            '"checklist":[{"title":"o que a equipe precisa preparar/agendar pra executar","resp":"área (trafego, social, account, design, edicao, captacao, comercial)"}],' +
            '"orcamento":"1 linha: verba mensal + canal + resultado esperado (benchmark Meta Click-to-WhatsApp CPL R$5-25)"}. ' +
            "5 a 7 itens no planejamento, 3 a 4 no checklist. Português, pronto pra usar.";

          let criadas = 0;
          for (const c of alvos) {
            const evs = eventosDo(c).slice(0, 4).map((e) => `${e.date} ${e.time || ""} ${String(e.title || "").slice(0, 70)}`);
            const motivo = evs.length ? `entrega/apresentação chegando (${evs[0].slice(0, 40)}…)` : "rodízio semanal da pauta";
            const abertas = tarefas
              .filter((t) => t && String(t.clienteId || "") === c.id && t.status !== "concluido")
              .slice(0, 8)
              .map((t) => `- ${String(t.title || "").slice(0, 80)} (${t.status || "?"})`);
            const anterior = briefings.find((b) => b.clienteId === c.id);
            const jaSugerido = anterior
              ? [...(anterior.plano || []), ...((anterior.ideias || []).map((i: any) => i.titulo))].slice(0, 10).join("; ")
              : "";
            const raw = await callAI(
              sysDoc,
              `Cliente da pauta: ${c.nm}. Segmento: ${c.seg}. Nota de conta: ${c.nota}\n` +
                `MOTIVO da pauta hoje: ${motivo}.\n` +
                `EVENTOS da semana deste cliente:\n${evs.join("\n") || "(nenhum na agenda)"}\n` +
                `TAREFAS ABERTAS deste cliente agora:\n${abertas.join("\n") || "(nenhuma)"}\n` +
                (jaSugerido ? `JÁ SUGERIDO ANTES (não repita): ${jaSugerido}\n` : "") +
                `Hoje é ${hoje}. Monte o documento de trabalho da semana.`,
              2600,
              "claude-sonnet-4-6", // conselho exige raciocínio profundo; Haiku truncava e degradava qualidade
              true, // sysDoc é constante entre clientes → cache economiza ~80% dos tokens de input
            );
            const j = parseJSON(raw);
            if (!j) continue;
            const planejamento = (Array.isArray(j.planejamento) ? j.planejamento : []).slice(0, 7)
              .map((p: any) => `${String(p?.data || "").slice(0, 10)} · ${String(p?.formato || "Post")} · ${String(p?.titulo || "").slice(0, 90)}${p?.gancho ? " — " + String(p.gancho).slice(0, 90) : ""}`)
              .filter((s: string) => s.length > 15);
            const brief = {
              id: "brf" + c.id + "-" + hoje + "-" + Date.now(),
              clienteId: c.id,
              cliente: c.nm,
              date: hoje,
              ts: Date.now(),
              lido: false,
              doc: true,
              motivo,
              debate: [],
              decisao: `📄 ${String(j.foco || "Documento de trabalho da semana")}`,
              plano: planejamento,
              referencias: [],
              parcerias: [],
              reunioes: [],
              roteiro: String(j.roteiro || ""),
              orcamento: String(j.orcamento || ""),
              // checklist de preparação vira "ideias" (o Gabriel dá check pra promover a tarefa)
              ideias: (Array.isArray(j.checklist) ? j.checklist : []).slice(0, 4).map((tk: any) => ({
                titulo: String(tk?.title || "").slice(0, 140), area: String(tk?.resp || ""), feito: false,
              })).filter((x: any) => x.titulo),
            };
            briefings.unshift(brief);
            criadas++; // conta o que este lote produziu (destrava o auto-encadeamento e o retorno)
            // Apenas as REUNIÕES/ALINHAMENTOS entram direto NA AGENDA (não no Kanban)
            (Array.isArray(j.reunioes) ? j.reunioes : []).slice(0, 1).forEach((rm: any, i: number) => {
              if (String(rm || "").length < 4) return;
              const evTitle = (c.id === "ark" ? "" : c.nm + ": ") + String(rm || "").slice(0, 80);
              if (!agenda.some((e) => e.title === evTitle)) {
                agenda.push({ id: "ce" + Date.now() + i + c.id, date: proxDiaUtil(i), title: evTitle, time: i === 0 ? "10:00" : "15:00", type: "reuniao", origem: "conselho" });
              }
            });
            notifs.push({ tipo: "conselho", clienteId: c.id, texto: `📄 Documento de trabalho pronto: ${c.nm} · ${motivo}` });
          }

          // persiste tudo — só grava tarefas se a leitura veio OK e o resultado é
          // estritamente maior (append-only). Nunca encolhe a lista real.
          let salvouTarefas = false;
          if (criadas && tarefasLoadOk && tarefas.length >= tarefasBaseLen + 1) {
            const { error: upErr } = await db.from("workflowark_state").upsert({ key: "wfa-tarefas", data: tarefas });
            salvouTarefas = !upErr;
          }
          await db.from("workflowark_state").upsert({ key: "wfa-conselho-briefings", data: briefings.slice(0, 60) });
          // grava os alinhamentos na agenda (append-only e só se a leitura veio OK)
          if (agendaOk && agenda.length > agendaBaseLen) { try { await db.from("workflowark_state").upsert({ key: "wfa-agenda-events", data: agenda.slice(-300) }); } catch { /* */ } }

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
          // (sem auto-encadeamento: a pauta é enxuta por desenho, 1-2 clientes por dia)
          return Response.json({ ok: true, ran: true, clientes: alvos.length, faltam, tarefas: criadas, tarefasSalvas: salvouTarefas, notificacoes: notifs.length });
        } catch (e) {
          return Response.json({ error: (e as Error)?.message || "falha" }, { status: 500 });
        }
      },
    },
  },
});
